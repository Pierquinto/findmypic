import crypto from 'crypto'

// Chiave di crittografia - in produzione dovrebbe essere nelle variabili d'ambiente
const ENCRYPTION_KEY = Buffer.from((process.env.ENCRYPTION_KEY || 'findmypic-aes-256-encryption-key-development-32-chars-long').padEnd(32, '0').slice(0, 32))
const ALGORITHM = 'aes-256-cbc'

/**
 * Crittografa dati sensibili e restituisce stringa per il database
 */
export function encryptSensitiveData(data: any): string {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Restituisce stringa in formato "iv:encrypted" per il database
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Errore durante la crittografia')
  }
}

/**
 * Decrittografa dati per gli admin
 */
export function decryptSensitiveData(encryptedString: string): any {
  try {
    const [ivHex, encryptedHex] = encryptedString.split(':')
    if (!ivHex || !encryptedHex) {
      throw new Error('Invalid encrypted data format')
    }
    
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    
    let decrypted = decipher.update(encrypted, null, 'utf8')
    decrypted += decipher.final('utf8')
    
    // Prova a parsare come JSON, altrimenti restituisce stringa
    try {
      return JSON.parse(decrypted)
    } catch {
      return decrypted
    }
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Errore durante la decrittografia')
  }
}

/**
 * Crittografa un URL o path di immagine
 */
export function encryptImagePath(imagePath: string): string {
  return encryptSensitiveData(imagePath)
}

/**
 * Decrittografa un URL o path di immagine
 */
export function decryptImagePath(encryptedPath: string): string {
  return decryptSensitiveData(encryptedPath)
}

/**
 * Hash per identificare univocamente i dati senza decrittarli
 */
export function createDataHash(data: any): string {
  const text = typeof data === 'string' ? data : JSON.stringify(data)
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16)
}

/**
 * Genera una chiave di sessione per l'admin
 */
export function generateAdminSessionKey(adminId: string): string {
  const timestamp = Date.now().toString()
  const combined = `${adminId}:${timestamp}:${crypto.randomBytes(16).toString('hex')}`
  return crypto.createHash('sha256').update(combined).digest('hex')
}

/**
 * Verifica se l'admin può decrittare i dati
 */
export function verifyAdminDecryptionRights(sessionKey: string, adminId: string): boolean {
  try {
    // Verifica che la sessione sia valida (entro le ultime 24 ore)
    const parts = Buffer.from(sessionKey, 'hex').toString().split(':')
    if (parts.length !== 3) return false
    
    const timestamp = parseInt(parts[1])
    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000
    
    return (now - timestamp) < twentyFourHours && parts[0] === adminId
  } catch {
    return false
  }
}