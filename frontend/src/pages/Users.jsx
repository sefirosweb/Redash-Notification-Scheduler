import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import client from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'

const EMPTY = { username: '', password: '', is_admin: false }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

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
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }

  function handleUpdate(e, userId) {
    e.preventDefault()
    client.put(`/users/${userId}`, editForm)
      .then(() => { setEditingId(null); setEditForm({}); loadUsers(); toast.success('Usuario actualizado') })
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }

  function handleDelete(user) {
    if (!confirm(`¿Eliminar usuario "${user.username}"?`)) return
    client.delete(`/users/${user.id}`)
      .then(() => { loadUsers(); toast.success(`Usuario "${user.username}" eliminado`) })
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }

  function openEdit(user) {
    setEditingId(user.id)
    setEditForm({ password: '', is_active: user.is_active, is_admin: user.is_admin })
  }

  return (
    <div className="space-y-6">
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
              <div className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" id="iadmin" checked={createForm.is_admin}
                  onChange={e => setCreateForm(f => ({ ...f, is_admin: e.target.checked }))}
                  className="w-4 h-4 accent-violet-600" />
                <Label htmlFor="iadmin">Administrador</Label>
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
                  <TableHead>Rol</TableHead>
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
                        <Badge variant={user.is_admin ? 'default' : 'secondary'}>
                          {user.is_admin ? 'Admin' : 'Usuario'}
                        </Badge>
                      </TableCell>
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
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(user)}>
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {editingId === user.id && (
                      <TableRow key={`${user.id}-edit`} className="bg-slate-50">
                        <TableCell colSpan={4} className="py-3">
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
                              <input type="checkbox" checked={editForm.is_admin}
                                onChange={e => setEditForm(f => ({ ...f, is_admin: e.target.checked }))}
                                className="accent-violet-600" />
                              Admin
                            </label>
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
