import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import client, { errorMessage } from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'

const FIELDS = [
  { key: 'redash_url',     label: 'Redash URL',       type: 'text',     placeholder: 'https://redash.empresa.com' },
  { key: 'redash_api_key', label: 'Redash API Key',   type: 'text',     placeholder: 'API key de Redash' },
  { key: 'smtp_server',    label: 'Servidor SMTP',    type: 'text',     placeholder: 'smtp.gmail.com' },
  { key: 'smtp_port',      label: 'Puerto SMTP',      type: 'number',   placeholder: '587' },
  { key: 'smtp_username',  label: 'Usuario SMTP',     type: 'text',     placeholder: 'correo@empresa.com' },
  { key: 'smtp_password',  label: 'Contraseña SMTP',  type: 'password', placeholder: '••••••••' },
  { key: 'smtp_from',      label: 'Remitente (From)', type: 'text',     placeholder: 'noreply@empresa.com' },
]

export default function Config() {
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get('/config/')
      .then(res => { setConfig(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    client.put('/config/', form)
      .then(res => { setConfig(res.data); setEditing(false); setForm(null); setSaving(false); toast.success('Configuración guardada') })
      .catch(err => { toast.error(errorMessage(err)); setSaving(false) })
  }

  if (loading) return <div className="text-slate-400 text-sm">Cargando configuración...</div>
  if (error)   return <div className="text-red-500 text-sm">{error}</div>
  if (!config) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración global</h1>
          <p className="text-sm text-slate-500 mt-0.5">Parámetros de conexión con Redash y SMTP</p>
        </div>
        {!editing && (
          <Button variant="outline" onClick={() => { setForm({ ...config }); setEditing(true) }}>
            <Pencil className="w-4 h-4" /> Editar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redash &amp; SMTP</CardTitle>
          <CardDescription>Credenciales de acceso y configuración de correo saliente</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELDS.map(({ key, label, type, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input id={key} type={type}
                      value={form[key] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button type="button" variant="outline"
                  onClick={() => { setEditing(false); setForm(null) }}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</dt>
                  <dd className="text-sm text-slate-700 break-all">
                    {type === 'password'
                      ? (config[key] ? '••••••••' : <span className="text-slate-400 italic">no configurado</span>)
                      : (config[key] || <span className="text-slate-400 italic">no configurado</span>)
                    }
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
