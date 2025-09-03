'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Ban, 
  CheckCircle,
  Users,
  Calendar,
  CreditCard
} from 'lucide-react'

interface User {
  id: string
  email: string
  plan: string
  searches: number
  customSearchLimit?: number | null
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
  profile?: {
    firstName?: string
    lastName?: string
    company?: string
    phone?: string
    website?: string
    bio?: string
  }
  _count: {
    Search: number
    Subscription: number
  }
}

export default function UsersManagement() {
  const { user, loading: authLoading  } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    email: '',
    searches: 0,
    customSearchLimit: null as number | null,
    profile: {
      firstName: '',
      lastName: '',
      company: '',
      phone: '',
      website: '',
      bio: ''
    },
    newPassword: ''
  })

  useEffect(() => {
    if (!authLoading && user) return
    
    if (!session || !(session.user as any).isAdmin) {
      router.push('/login')
      return
    }

    fetchUsers()
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async (userId: string, action: string) => {
    if (action === 'edit') {
      // Fetch user details and open edit modal
      try {
        const response = await fetch(`/api/admin/users/${userId}`)
        if (response.ok) {
          const { user } = await response.json()
          setEditingUser(user)
          setEditForm({
            email: user.email,
            searches: user.searches,
            customSearchLimit: user.customSearchLimit,
            profile: {
              firstName: user.profile?.firstName || '',
              lastName: user.profile?.lastName || '',
              company: user.profile?.company || '',
              phone: user.profile?.phone || '',
              website: user.profile?.website || '',
              bio: user.profile?.bio || ''
            },
            newPassword: ''
          })
          setShowEditModal(true)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        fetchUsers() // Refresh data
      }
    } catch (error) {
      console.error('Error performing user action:', error)
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      // Update profile
      await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_profile',
          data: {
            email: editForm.email,
            profile: editForm.profile
          }
        })
      })

      // Update search settings
      await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_search_settings',
          data: {
            searches: editForm.searches,
            customSearchLimit: editForm.customSearchLimit
          }
        })
      })

      // Update password if provided
      if (editForm.newPassword) {
        await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'change_password',
            data: {
              newPassword: editForm.newPassword
            }
          })
        })
      }

      setShowEditModal(false)
      setEditingUser(null)
      fetchUsers() // Refresh data
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlan = planFilter === 'all' || user.plan === planFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive)
    
    return matchesSearch && matchesPlan && matchesStatus
  })

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'bg-purple-100 text-purple-800'
      case 'basic': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!authLoading && user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totale Utenti</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Utenti Attivi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Abbonamenti Attivi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.plan !== 'free').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <Search className="h-8 w-8 text-gray-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ricerche Totali</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.reduce((sum, u) => sum + u._count.Search, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cerca per email
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca utente..."
                  className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Piano
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">Tutti i piani</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tutti gli stati</option>
                <option value="active">Attivi</option>
                <option value="inactive">Non attivi</option>
              </select>
            </div>

            <div className="flex items-end">
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                <Filter className="h-4 w-4 inline mr-2" />
                Filtra
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id))
                        } else {
                          setSelectedUsers([])
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Piano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ricerche
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registrazione
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id])
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="text-sm text-gray-500">ID: {user.id.slice(-8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(user.plan)}`}>
                        {user.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user._count.Search}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(user.createdAt).toLocaleDateString('it-IT')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Attivo' : 'Bloccato'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUserAction(user.id, 'edit')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction(user.id, user.isActive ? 'deactivate' : 'activate')}
                          className={`${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleUserAction(user.id, 'delete')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} utenti selezionati
              </span>
              <div className="flex space-x-2">
                <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                  Disattiva
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  Attiva
                </button>
                <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  Esporta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Modifica Utente: {editingUser.email}
              </h2>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ricerche Utilizzate
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        value={editForm.searches}
                        onChange={(e) => setEditForm({ ...editForm, searches: parseInt(e.target.value) || 0 })}
                        className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, searches: 0 })}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Limite Ricerche Personalizzato
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        value={editForm.customSearchLimit || ''}
                        onChange={(e) => setEditForm({ ...editForm, customSearchLimit: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Usa limite piano"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, customSearchLimit: null })}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Lascia vuoto per usare il limite del piano ({editingUser?.plan})
                    </p>
                  </div>
                </div>

                {/* Profile Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Profilo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={editForm.profile.firstName}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          profile: { ...editForm.profile, firstName: e.target.value }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cognome
                      </label>
                      <input
                        type="text"
                        value={editForm.profile.lastName}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          profile: { ...editForm.profile, lastName: e.target.value }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Azienda
                      </label>
                      <input
                        type="text"
                        value={editForm.profile.company}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          profile: { ...editForm.profile, company: e.target.value }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefono
                      </label>
                      <input
                        type="text"
                        value={editForm.profile.phone}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          profile: { ...editForm.profile, phone: e.target.value }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sito Web
                      </label>
                      <input
                        type="url"
                        value={editForm.profile.website}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          profile: { ...editForm.profile, website: e.target.value }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.profile.bio}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          profile: { ...editForm.profile, bio: e.target.value }
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Change */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cambia Password</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nuova Password (lascia vuoto per non modificare)
                    </label>
                    <input
                      type="password"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Inserisci nuova password..."
                    />
                    {editForm.newPassword && editForm.newPassword.length < 6 && (
                      <p className="text-sm text-red-600 mt-1">
                        La password deve essere di almeno 6 caratteri
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}