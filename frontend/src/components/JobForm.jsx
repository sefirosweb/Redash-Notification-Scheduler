import { useState, useEffect } from 'react'
import client from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'

export default function JobForm({ job, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:      job?.name      || '',
    query_id:  job?.query_id  || '',
    cron_expr: job?.cron_expr || '',
    format:    job?.format    || 'html',
    body:      job?.body      || '',
    active:    job?.active    ?? true,
    group_id:  job?.group_id  || '',
  })
  const [groups, setGroups] = useState([])

  useEffect(() => {
    client.get('/groups/').then(res => setGroups(res.data)).catch(() => {})
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{job ? 'Editar Job' : 'Nuevo Job'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={e => {
          e.preventDefault()
          onSave({ ...form, query_id: parseInt(form.query_id), group_id: parseInt(form.group_id) })
        }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="jname">Nombre</Label>
            <Input id="jname" value={form.name}
              onChange={e => set('name', e.target.value)}
              required placeholder="Reporte semanal ventas" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jqid">Query ID (Redash)</Label>
            <Input id="jqid" type="number" value={form.query_id}
              onChange={e => set('query_id', e.target.value)}
              required placeholder="42" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jcron">Expresión cron</Label>
            <Input id="jcron" value={form.cron_expr}
              onChange={e => set('cron_expr', e.target.value)}
              required placeholder="0 8 * * 1" />
            <p className="text-xs text-slate-400">Ej: <code>0 8 * * 1</code> = lunes a las 8:00</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jformat">Formato</Label>
            <Select id="jformat" value={form.format} onChange={e => set('format', e.target.value)}>
              <option value="html">HTML (correo)</option>
              <option value="pdf">PDF adjunto</option>
              <option value="excel">Excel adjunto</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jgroup">Grupo de destinatarios</Label>
            <Select id="jgroup" value={form.group_id}
              onChange={e => set('group_id', e.target.value)} required>
              <option value="">Selecciona un grupo...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>

          <div className="flex flex-col justify-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active}
                onChange={e => set('active', e.target.checked)}
                className="w-4 h-4 accent-violet-600" />
              <span className="text-sm font-medium text-slate-700">Job activo</span>
            </label>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="jbody">Descripción / texto introductorio (opcional)</Label>
            <textarea
              id="jbody"
              value={form.body}
              onChange={e => set('body', e.target.value)}
              placeholder="Este reporte muestra el stock actual de todos los almacenes..."
              rows={3}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-slate-400">Aparece antes del contenido del reporte en el email.</p>
          </div>

          <div className="sm:col-span-2 flex gap-2 pt-2 border-t border-slate-100">
            <Button type="submit">Guardar</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
