import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import client from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'

function formatDate(str) {
  if (!str) return null
  try {
    return new Date(str).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return str }
}

function ConfirmDialog({ token, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Revocar token</h2>
        <p className="text-sm text-slate-600">
          ¿Seguro que quieres revocar el token <span className="font-semibold text-slate-900">"{token.name}"</span>?
          Cualquier integración que lo use dejará de funcionar.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
            Revocar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function TokenRevealModal({ rawToken, onClose }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(rawToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Token creado</h2>
        <p className="text-sm text-slate-600">
          Copia el token ahora. <span className="font-semibold text-slate-900">No volverá a mostrarse.</span>
        </p>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <code className="flex-1 text-xs text-slate-800 break-all font-mono">{rawToken}</code>
          <button onClick={copy}
            className="shrink-0 p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Úsalo en tus peticiones con la cabecera:<br />
          <code className="font-mono">Authorization: Bearer {rawToken}</code>
        </p>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Entendido, ya lo copié</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const EMPTY = { name: '', expires_at: '' }

export default function ApiTokens() {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [confirmToken, setConfirmToken] = useState(null)
  const [revealToken, setRevealToken] = useState(null)

  function loadTokens() {
    setLoading(true)
    client.get('/api-tokens/')
      .then(res => { setTokens(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { loadTokens() }, [])

  function handleCreate(e) {
    e.preventDefault()
    const payload = { name: form.name }
    if (form.expires_at) payload.expires_at = form.expires_at
    client.post('/api-tokens/', payload)
      .then(res => {
        setShowCreate(false)
        setForm(EMPTY)
        loadTokens()
        setRevealToken(res.data.token)
        toast.success('Token creado')
      })
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }

  function confirmRevoke() {
    const t = confirmToken
    setConfirmToken(null)
    client.delete(`/api-tokens/${t.id}`)
      .then(() => { loadTokens(); toast.success(`Token "${t.name}" revocado`) })
      .catch(err => toast.error(err.response?.data?.detail || err.message))
  }

  return (
    <div className="space-y-6">
      {confirmToken && (
        <ConfirmDialog
          token={confirmToken}
          onConfirm={confirmRevoke}
          onCancel={() => setConfirmToken(null)}
        />
      )}
      {revealToken && (
        <TokenRevealModal
          rawToken={revealToken}
          onClose={() => setRevealToken(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Tokens</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tokens para acceder a la API desde sistemas externos</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setForm(EMPTY) }}>
          <Plus className="w-4 h-4" /> Crear Token
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Nuevo token</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tname">Nombre</Label>
                <Input id="tname" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Mi integración ERP" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="texp">Fecha de expiración <span className="text-slate-400 font-normal">(opcional)</span></Label>
                <Input id="texp" type="datetime-local" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
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
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No hay tokens creados todavía.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">{t.created_by || '—'}</TableCell>
                    <TableCell>
                      {t.expires_at
                        ? <span className="text-xs text-slate-600">{formatDate(t.expires_at)}</span>
                        : <Badge variant="outline">Sin expiración</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(t.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => setConfirmToken(t)}>
                        Revocar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-slate-700">Cómo usar el endpoint</CardTitle></CardHeader>
        <CardContent className="text-xs text-slate-600 space-y-2">
          <p>Endpoint: <code className="font-mono bg-slate-100 px-1 rounded">POST /api/redash/queries/&#123;query_id&#125;/execute</code></p>
          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs overflow-auto">{`curl -X POST ${window.location.origin}/api/redash/queries/123/execute \\
  -H "Authorization: Bearer rns_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "max_age": 0,
    "parameters": {
      "fecha": { "start": "2025-01-01", "end": "2025-03-31" },
      "proveedor": "Acme S.A."
    }
  }'`}</pre>
          <p className="text-slate-400">
            <code className="font-mono">max_age: 0</code> = tiempo real (por defecto). Valor mayor (segundos) para caché.
            Si hay error de parámetros, la respuesta incluye <code className="font-mono">expected_parameters</code> con el formato exacto que espera cada campo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
