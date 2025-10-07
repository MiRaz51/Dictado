// ============================================================================
// PEER MANAGER - Gestión de comunicación PeerJS
// ============================================================================

class PeerManager {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // Map<peerId, connection>
    this.role = null; // 'tutor' | 'participant'
    this.sessionId = null;
    this.isConnected = false;
    this.onParticipantJoined = null;
    this.onParticipantLeft = null;
    this.onDataReceived = null;
    this.onConnectionStatusChanged = null;
    this.MAX_FREE_PARTICIPANTS = 10; // Límite gratuito (1 tutor + 10 estudiantes)
    this.ENFORCE_LIMIT = false; // Fase de despliegue: límite no activo técnicamente
    this.SHOW_SOFT_WARNING = false; // Fase de despliegue: banner informativo desactivado
    this.limitWarningShown = false; // Para mostrar advertencia solo una vez
  }

  // Inicializar como tutor (servidor)
  async initAsTutor() {
    try {
      this.role = 'tutor';
      
      // Generar ID para el tutor (modo desarrollo: ID fijo)
      const devFixed = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.DEV_DISABLE_SESSION_ID)
        ? (window.CONFIG.DEV_FIXED_TUTOR_ID || 'TUTOR_DEV')
        : null;
      const tutorId = devFixed || this.generateSessionId();
      
      // Usar servidor público de PeerJS (más confiable)
      this.peer = new Peer(tutorId);

      return new Promise((resolve, reject) => {
        this.peer.on('open', (id) => {
          this.sessionId = id;
          this.isConnected = true;
          this.setupTutorListeners();
          resolve(id);
        });

        this.peer.on('error', (error) => {
          reject(error);
        });

        // Timeout de 10 segundos
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Timeout al conectar como tutor'));
          }
        }, 10000);
      });
    } catch (error) {
      throw error;
    }
  }

  // Inicializar como participante (cliente)
  async initAsParticipant(tutorSessionId) {
    try {
      this.role = 'participant';
      
      // Generar ID único para el participante
      const participantId = this.generateParticipantId();
      
      // Usar servidor público de PeerJS (más confiable)
      this.peer = new Peer(participantId);

      return new Promise((resolve, reject) => {
        this.peer.on('open', (id) => {
          // En modo desarrollo permitir conectar a un ID fijo si no se proporciona uno
          const targetId = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.DEV_DISABLE_SESSION_ID && !tutorSessionId)
            ? (window.CONFIG.DEV_FIXED_TUTOR_ID || 'TUTOR_DEV')
            : tutorSessionId;
          this.connectToTutor(targetId)
            .then(() => resolve(id))
            .catch(reject);
        });

        this.peer.on('error', (error) => {
          reject(error);
        });

        // Timeout de 10 segundos
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Timeout al conectar como participante'));
          }
        }, 10000);
      });
    } catch (error) {
      throw error;
    }
  }

  // Configurar listeners para el tutor
  setupTutorListeners() {
    this.peer.on('connection', (conn) => {
      
      conn.on('open', () => {
        // Verificar límite de participantes gratuitos
        const currentCount = this.connections.size;
        
        if (currentCount >= this.MAX_FREE_PARTICIPANTS) {
          // FASE DE DESPLIEGUE: Solo advertir, no bloquear
          if (this.ENFORCE_LIMIT) {
            // FUTURO: Bloquear conexión cuando se active el límite
            conn.send({
              type: 'join_denied',
              reason: 'limit_reached',
              message: `El tutor ha alcanzado el límite de ${this.MAX_FREE_PARTICIPANTS} participantes gratuitos. Para grupos más grandes, contacta: hgomero@gmail.com`
            });
            
            this.showParticipantLimitWarning();
            
            setTimeout(() => {
              try { conn.close(); } catch(_) {}
            }, 1000);
            
            return; // No agregar a conexiones
          } else {
            // AHORA: Permitir conexión sin mensaje (fase inicial)
            if (this.SHOW_SOFT_WARNING && !this.limitWarningShown) {
              this.showSoftLimitWarning(currentCount + 1);
              this.limitWarningShown = true;
            }
          }
        }
        
        this.connections.set(conn.peer, conn);
        
        // Notificar que se unió un participante
        if (this.onParticipantJoined) {
          this.onParticipantJoined(conn.peer, conn);
        }
      });

      conn.on('data', (data) => {
        if (this.onDataReceived) {
          this.onDataReceived(conn.peer, data);
        }
      });

      conn.on('close', () => {
          this.connections.delete(conn.peer);
        
        if (this.onParticipantLeft) {
          this.onParticipantLeft(conn.peer);
        }
      });

      conn.on('error', (error) => {
        this.connections.delete(conn.peer);
        
        if (this.onParticipantLeft) {
          this.onParticipantLeft(conn.peer);
        }
      });
    });
  }

  // Conectar a tutor (desde participante)
  async connectToTutor(tutorSessionId) {
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(tutorSessionId);
      
      conn.on('open', () => {
        this.connections.set(tutorSessionId, conn);
        this.sessionId = tutorSessionId;
        this.isConnected = true;
        
        // Enviar información del participante con nombre
        this.sendToTutor({
          type: 'participant_info',
          participantId: this.peer.id,
          participantName: window.participantName || 'Participante sin nombre',
          timestamp: Date.now()
        });
        
        resolve();
      });

      conn.on('data', (data) => {
        if (this.onDataReceived) {
          this.onDataReceived(tutorSessionId, data);
        }
      });

      conn.on('close', () => {
        this.isConnected = false;
        this.connections.delete(tutorSessionId);
        
        if (this.onConnectionStatusChanged) {
          this.onConnectionStatusChanged(false);
        }
      });

      conn.on('error', (error) => {
        reject(error);
      });

      // Timeout de 10 segundos
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Timeout al conectar con el tutor'));
        }
      }, 10000);
    });
  }

  // Enviar datos a todos los participantes (desde tutor)
  broadcastToParticipants(data) {
    if (this.role !== 'tutor') {
      return;
    }

    
    this.connections.forEach((conn, peerId) => {
      try {
        if (conn.open) {
          conn.send(data);
        }
      } catch (error) {
      }
    });
  }

  // Enviar datos al tutor (desde participante)
  sendToTutor(data) {
    if (this.role !== 'participant') {
      return;
    }

    const tutorConn = this.connections.get(this.sessionId);
    if (tutorConn && tutorConn.open) {
      try {
        tutorConn.send(data);
      } catch (error) {
      }
    } else {
    }
  }

  // Enviar datos a un participante específico (desde tutor)
  sendToParticipant(participantId, data) {
    if (this.role !== 'tutor') {
      return;
    }

    const conn = this.connections.get(participantId);
    if (conn && conn.open) {
      try {
        conn.send(data);
      } catch (error) {
      }
    } else {
    }
  }

  // Desconectar a un participante específico (desde tutor)
  disconnectParticipant(participantId) {
    if (this.role !== 'tutor') {
      return;
    }
    const conn = this.connections.get(participantId);
    if (conn) {
      try {
        if (conn.open) {
          conn.close();
        }
      } catch (error) {
      }
      this.connections.delete(participantId);
    }
  }

  // Obtener lista de participantes conectados
  getConnectedParticipants() {
    if (this.role !== 'tutor') return [];
    
    return Array.from(this.connections.keys()).filter(peerId => {
      const conn = this.connections.get(peerId);
      return conn && conn.open;
    });
  }

  // Obtener número de participantes conectados
  getParticipantCount() {
    return this.getConnectedParticipants().length;
  }

  // Desconectar y limpiar
  disconnect() {
    
    // Cerrar todas las conexiones
    this.connections.forEach((conn) => {
      try {
        if (conn.open) {
          conn.close();
        }
      } catch (error) {
      }
    });
    
    this.connections.clear();
    
    // Cerrar peer
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (error) {
        }
      this.peer = null;
    }
    
    this.isConnected = false;
    this.sessionId = null;
    this.role = null;
  }

  // Generar ID único (unificado)
  generateId(prefix = '', length = 6, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return prefix + result;
  }

  // Generar ID de sesión único para el tutor
  generateSessionId() {
    return this.generateId('TUTOR_', 6);
  }

  // Generar ID único para participante
  generateParticipantId() {
    return this.generateId('participant_', 8, 'abcdefghijklmnopqrstuvwxyz0123456789');
  }

  // Mostrar advertencia suave (no intrusiva) durante fase de despliegue
  showSoftLimitWarning(participantCount) {
    try {
      let banner = document.getElementById('softLimitBanner');
      
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'softLimitBanner';
        banner.className = 'card';
        banner.style.cssText = 'background: #dbeafe; border-left: 4px solid #3b82f6; margin: 16px 0; padding: 16px; animation: fadeInOverlay 0.3s ease-out;';
        
        const tutorPage = document.getElementById('page-tutor');
        const configSummary = document.getElementById('tutorConfigSummary');
        if (tutorPage && configSummary) {
          configSummary.parentNode.insertBefore(banner, configSummary.nextSibling);
        }
      }
      
      banner.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
          <div style="font-size: 24px;">ℹ️</div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 8px; color: #1e40af;">Información sobre Límite de Participantes</h4>
            <p style="margin: 0 0 8px; color: #1e3a8a; font-size: 14px;">
              Tienes <strong>${participantCount} participantes</strong> conectados. El límite gratuito establecido es de <strong>10 participantes por sesión</strong>.
            </p>
            <p style="margin: 0 0 12px; color: #1e3a8a; font-size: 13px;">
              Durante este período inicial, puedes continuar usando con más participantes. 
              Si planeas usar regularmente con grupos grandes, te invitamos a contactar para una licencia institucional.
            </p>
            <p style="margin: 0; font-size: 13px;">
              <a href="mailto:hgomero@gmail.com?subject=Consulta%20Licencia%20Institucional&body=Hola,%0A%0AEstoy%20usando%20la%20aplicación%20con%20${participantCount}%20participantes%20y%20me%20gustaría%20información%20sobre%20licencias%20institucionales.%0A%0ANombre/Institución:%20%0AFrecuencia%20de%20uso:%20%0A%0AGracias." 
                 style="color: #2563eb; font-weight: 600; text-decoration: none;">
                📧 Más información
              </a>
              <button onclick="document.getElementById('softLimitBanner').style.display='none'" 
                      style="margin-left: 16px; padding: 4px 12px; background: transparent; border: 1px solid #3b82f6; color: #2563eb; border-radius: 6px; cursor: pointer; font-size: 12px;">
                Entendido
              </button>
            </p>
          </div>
        </div>
      `;
      
      banner.style.display = 'block';
      
    } catch(e) {
      console.error('[PeerManager] Error mostrando banner suave:', e);
    }
  }

  // Mostrar advertencia de límite de participantes (bloqueante - futuro)
  showParticipantLimitWarning() {
    try {
      // Buscar o crear el banner de advertencia
      let banner = document.getElementById('groupLimitBanner');
      
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'groupLimitBanner';
        banner.className = 'card';
        banner.style.cssText = 'background: #fef3c7; border-left: 4px solid #f59e0b; margin: 16px 0; animation: fadeInOverlay 0.3s ease-out;';
        
        // Insertar después del resumen de configuración
        const tutorPage = document.getElementById('page-tutor');
        const configSummary = document.getElementById('tutorConfigSummary');
        if (tutorPage && configSummary) {
          configSummary.parentNode.insertBefore(banner, configSummary.nextSibling);
        }
      }
      
      banner.innerHTML = `
        <h4 style="margin: 0 0 12px; color: #92400e;">⚠️ Límite de Participantes Alcanzado</h4>
        <p style="margin: 0 0 8px; color: #78350f;">
          Has alcanzado el límite de <strong>${this.MAX_FREE_PARTICIPANTS} participantes gratuitos</strong>.
        </p>
        <p style="margin: 0 0 12px; color: #78350f;">
          Para usar el modo grupal con más participantes, contacta:
        </p>
        <p style="margin: 0;">
          <a href="mailto:hgomero@gmail.com?subject=Solicitud%20Licencia%20-%20Grupo%20Grande&body=Hola,%0A%0ASolicito%20información%20para%20usar%20el%20modo%20grupal%20con%20más%20de%20${this.MAX_FREE_PARTICIPANTS}%20participantes.%0A%0ANombre/Institución:%20%0ANúmero%20de%20participantes:%20%0AFrecuencia%20de%20uso:%20%0A%0AGracias." 
             style="color: #0ea5e9; font-weight: 600; text-decoration: none;">
            📧 hgomero@gmail.com
          </a>
        </p>
        <p style="margin: 8px 0 0; font-size: 12px; color: #92400e;">
          <em>Respuesta en 24-48 horas. Donativos desde $X/mes según necesidades.</em>
        </p>
      `;
      
      banner.style.display = 'block';
      
      // Auto-ocultar después de 30 segundos
      setTimeout(() => {
        if (banner && this.connections.size < this.MAX_FREE_PARTICIPANTS) {
          banner.style.display = 'none';
        }
      }, 30000);
      
    } catch(e) {
      console.error('[PeerManager] Error mostrando banner de límite:', e);
    }
  }

  // Verificar si está conectado
  isReady() {
    return this.isConnected && this.peer && !this.peer.destroyed;
  }

  // Obtener información del estado actual
  getStatus() {
    return {
      role: this.role,
      sessionId: this.sessionId,
      isConnected: this.isConnected,
      participantCount: this.getParticipantCount(),
      peerId: this.peer?.id || null
    };
  }
}

// Instancia global del manager
window.peerManager = new PeerManager();
