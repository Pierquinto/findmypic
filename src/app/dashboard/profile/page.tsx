'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/client';
import DashboardLayout from '@/components/DashboardLayout'
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Save, 
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  plan: string
  searches: number
  createdAt: string
  isAdmin: boolean
  profile?: {
    firstName?: string
    lastName?: string
    company?: string
    phone?: string
    website?: string
    bio?: string
  }
}

export default function ProfilePage() {
  const { user, loading: authLoading  } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    website: '',
    bio: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          firstName: data.profile?.firstName || '',
          lastName: data.profile?.lastName || '',
          company: data.profile?.company || '',
          phone: data.profile?.phone || '',
          website: data.profile?.website || '',
          bio: data.profile?.bio || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'Errore nel caricamento del profilo' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profilo aggiornato con successo!' })
        await fetchProfile() // Refresh profile data
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Errore nell\'aggiornamento' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore di connessione' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.')) {
      return
    }

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE'
      })

      if (response.ok) {
        // Logout and redirect
        window.location.href = '/'
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Errore nell\'eliminazione dell\'account' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore di connessione' })
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Profilo" description="Gestisci le informazioni del tuo account">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento profilo...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Profilo" description="Gestisci le informazioni del tuo account">
      <div className="max-w-4xl mx-auto">
        
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        )}

        {/* Account Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-6 w-6 mr-2 text-purple-600" />
            Informazioni Account
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{profile?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Piano</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                  profile?.plan === 'pro' 
                    ? 'bg-purple-100 text-purple-800'
                    : profile?.plan === 'basic'
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile?.plan?.toUpperCase() || 'FREE'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Membro dal</p>
                <p className="font-medium text-gray-900">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('it-IT') : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-400">#</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ricerche effettuate</p>
                <p className="font-medium text-gray-900">{profile?.searches || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Informazioni Personali
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Il tuo nome"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Cognome
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Il tuo cognome"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Azienda (opzionale)
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Nome azienda"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono (opzionale)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="+39 123 456 7890"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Sito web (opzionale)
              </label>
              <input
                type="url"
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="https://tuosito.com"
              />
            </div>
            
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Biografia (opzionale)
              </label>
              <textarea
                id="bio"
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Raccontaci qualcosa di te..."
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Modifiche
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-4 flex items-center">
            <AlertCircle className="h-6 w-6 mr-2 text-red-600" />
            Zona Pericolosa
          </h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              <strong>Attenzione:</strong> L'eliminazione dell'account è irreversibile. 
              Tutti i tuoi dati, ricerche e configurazioni verranno eliminati permanentemente.
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Elimina Account</h3>
              <p className="text-sm text-gray-500">
                Rimuovi permanentemente il tuo account e tutti i dati associati.
              </p>
            </div>
            
            <button
              onClick={() => setShowDeleteAccount(!showDeleteAccount)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
            >
              {showDeleteAccount ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showDeleteAccount ? 'Nascondi' : 'Mostra Opzioni'}
            </button>
          </div>
          
          {showDeleteAccount && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <p className="text-sm text-gray-600 mb-4">
                Per confermare l'eliminazione, clicca il pulsante sottostante. 
                Ti verrà chiesta una conferma finale.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina Account Definitivamente
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}