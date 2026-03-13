import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import client, { errorMessage } from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'

const EMPTY = { username: '', password: '' }

function ConfirmDialog({ user, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Eliminar usuario</h2>
        <p className="text-sm text-slate-600">
          ¿Seguro que quieres eliminar el usuario <span className="font-semibold text-slate-900">"{user.username}"</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function getCurrentUsername() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub
  } catch { return null }
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [confirmUser, setConfirmUser] = useState(null)
  const currentUsername = getCurrentUsername()

  function loadUsers() {
    setLoading(true)
    client.get('/users/')
      .then(res => { setUsers(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { loadUsers() }, [])

  function handleCreate(e) {
    e.preventDefault()
    client.post('/users/', createForm)
      .then(() => { setShowCreate(false); setCreateForm(EMPTY); loadUsers(); toast.success('Usuario creado') })
      .catch(err => toast.error(errorMessage(err)))
  }

  function handleUpdate(e, userId) {
    e.preventDefault()
    client.put(`/users/${userId}`, editForm)
      .then(() => { setEditingId(null); setEditForm({}); loadUsers(); toast.success('Usuario actualizado') })
      .catch(err => toast.error(errorMessage(err)))
  }

  function handleDelete(user) {
    setConfirmUser(user)
  }

  function confirmDelete() {
    const user = confirmUser
    setConfirmUser(null)
    client.delete(`/users/${user.id}`)
      .then(() => { loadUsers(); toast.success(`Usuario "${user.username}" eliminado`) })
      .catch(err => toast.error(errorMessage(err)))
  }

  function openEdit(user) {
    setEditingId(user.id)
    setEditForm({ password: '', is_active: user.is_active })
  }

  return (
    <div className="space-y-6">
      {confirmUser && (
        <ConfirmDialog
          user={confirmUser}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmUser(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona el acceso a Redash Mailer</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setCreateForm(EMPTY) }}>
          <Plus className="w-4 h-4" /> Crear Usuario
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Nuevo usuario</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="un">Nombre de usuario</Label>
                <Input id="un" value={createForm.username}
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                  required placeholder="juan" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Contraseña</Label>
                <Input id="pw" type="password" value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  required placeholder="••••••••" />
              </div>
              <div className="sm:col-span-2 flex gap-2 border-t border-slate-100 pt-2">
                <Button type="submit">Crear</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <>
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-slate-900">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'success' : 'outline'}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm"
                            onClick={() => editingId === user.id ? setEditingId(null) : openEdit(user)}>
                            {editingId === user.id ? 'Cancelar' : 'Editar'}
                          </Button>
                          <Button
                            variant="destructive" size="sm"
                            onClick={() => handleDelete(user)}
                            disabled={user.username === currentUsername}
                            title={user.username === currentUsername ? 'No puedes eliminarte a ti mismo' : undefined}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {editingId === user.id && (
                      <TableRow key={`${user.id}-edit`} className="bg-slate-50">
                        <TableCell colSpan={3} className="py-3">
                          <form onSubmit={e => handleUpdate(e, user.id)}
                                className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Nueva contraseña</Label>
                              <Input type="password" placeholder="dejar vacío para no cambiar"
                                value={editForm.password}
                                onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                                className="h-8 text-xs w-56" />
                            </div>
                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input type="checkbox" checked={editForm.is_active}
                                onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                                className="accent-violet-600" />
                              Activo
                            </label>
                            <Button type="submit" size="sm">Guardar</Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
