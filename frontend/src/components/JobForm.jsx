import { useState, useEffect, useRef } from 'react'
import client from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select } from './ui/select'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'

const DATE_PRESETS = [
  { value: 'today',        label: 'Hoy' },
  { value: 'yesterday',    label: 'Ayer' },
  { value: 'last_7_days',  label: 'Últimos 7 días' },
  { value: 'last_30_days', label: 'Últimos 30 días' },
  { value: 'last_90_days', label: 'Últimos 90 días' },
  { value: 'this_month',   label: 'Este mes' },
  { value: 'last_month',   label: 'Mes anterior' },
  { value: 'this_year',    label: 'Este año' },
]

function QueryPicker({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [queries, setQueries] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedName, setSelectedName] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    client.get(`/redash/queries?q=${encodeURIComponent(search)}`)
      .then(res => setQueries(res.data))
      .catch(() => setQueries([]))
      .finally(() => setLoading(false))
  }, [search, open])

  // If editing existing job, fetch query name on mount
  useEffect(() => {
    if (value && !selectedName) {
      client.get(`/redash/queries/${value}`)
        .then(res => setSelectedName(res.data.name))
        .catch(() => setSelectedName(`Query #${value}`))
    }
  }, [value])

  function select(q) {
    setSelectedName(q.name)
    setOpen(false)
    setSearch('')
    onChange(q)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <span className={selectedName ? 'text-slate-900' : 'text-slate-400'}>
          {selectedName || (value ? `#${value}` : 'Selecciona una query...')}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar query..."
              className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <ul className="max-h-56 overflow-auto py-1">
            {loading && <li className="px-3 py-2 text-xs text-slate-400">Cargando...</li>}
            {!loading && queries.length === 0 && <li className="px-3 py-2 text-xs text-slate-400">Sin resultados</li>}
            {queries.map(q => (
              <li key={q.id}
                onClick={() => select(q)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-violet-50 hover:text-violet-700 flex items-center justify-between gap-2"
              >
                <span className="truncate">{q.name}</span>
                <span className="text-xs text-slate-400 shrink-0">#{q.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Searchable dropdown.
 * options: array of strings OR { label, value } objects.
 * value: the currently selected value (string or id).
 */
function SearchableSelect({ value, onChange, options, loading, placeholder = 'Selecciona...' }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Normalise each option to { label, value }
  const normalised = options.map(o =>
    typeof o === 'object' && o !== null ? o : { label: String(o), value: String(o) }
  )

  const filtered = normalised.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = normalised.find(o => String(o.value) === String(value))?.label

  function select(opt) {
    onChange(opt.value)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="w-full flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
      >
        <span className={selectedLabel ? 'text-slate-900' : 'text-slate-400'}>
          {loading ? 'Cargando opciones...' : (selectedLabel || placeholder)}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <ul className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-xs text-slate-400">Sin resultados</li>}
            {value !== '' && value !== null && value !== undefined && (
              <li
                onClick={() => { onChange(''); setOpen(false); setSearch('') }}
                className="px-3 py-2 text-xs text-slate-400 cursor-pointer hover:bg-slate-50 italic"
              >
                — Limpiar selección —
              </li>
            )}
            {filtered.map(o => (
              <li key={o.value}
                onClick={() => select(o)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-violet-50 hover:text-violet-700 ${String(o.value) === String(value) ? 'bg-violet-50 text-violet-700 font-medium' : ''}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function QueryDropdownField({ param, cfg, update }) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!param.queryId) { setLoading(false); return }
    client.get(`/redash/queries/${param.queryId}/results`)
      .then(res => {
        const rows = res.data || []
        setOptions(rows.map(row => Object.values(row)[0]).filter(v => v != null).map(String))
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [param.queryId])

  return (
    <div className="space-y-1.5">
      <Label>{param.title || param.name}</Label>
      <SearchableSelect
        value={cfg.value}
        onChange={v => update({ value: v, is_preset: false })}
        options={options}
        loading={loading}
      />
    </div>
  )
}

function ParamField({ param, value, onChange }) {
  const { name, title, type, enumOptions } = param
  const cfg = value || { type, value: '', is_preset: false }

  function update(patch) {
    onChange(name, { ...cfg, type, ...patch })
  }

  if (type === 'query') {
    return <QueryDropdownField param={param} cfg={cfg} update={update} />
  }

  const isDateType = type === 'date' || type === 'datetime-local'
  const isRangeType = type === 'date-range' || type === 'datetime-range'

  if (isDateType || isRangeType) {
    const inputType = (type === 'datetime-local' || type === 'datetime-range') ? 'datetime-local' : 'date'
    return (
      <div className="space-y-1.5">
        <Label>{title || name}</Label>

        {/* Preset pills */}
        <div className="flex flex-wrap gap-1">
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => update({ value: p.value, is_preset: true })}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                cfg.is_preset && cfg.value === p.value
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Free date input(s) — always visible */}
        {isRangeType ? (
          <div className="flex gap-2">
            <Input
              type={inputType}
              placeholder="Inicio"
              value={!cfg.is_preset ? (cfg.value?.start || '') : ''}
              onChange={e => update({ value: { ...(cfg.value || {}), start: e.target.value }, is_preset: false })}
            />
            <Input
              type={inputType}
              placeholder="Fin"
              value={!cfg.is_preset ? (cfg.value?.end || '') : ''}
              onChange={e => update({ value: { ...(cfg.value || {}), end: e.target.value }, is_preset: false })}
            />
          </div>
        ) : (
          <Input
            type={inputType}
            value={!cfg.is_preset ? (typeof cfg.value === 'string' ? cfg.value : '') : ''}
            onChange={e => update({ value: e.target.value, is_preset: false })}
          />
        )}

        {cfg.is_preset && (
          <p className="text-xs text-violet-600 font-medium">
            Preset activo: {DATE_PRESETS.find(p => p.value === cfg.value)?.label}
            {' · '}
            <button type="button" className="underline" onClick={() => update({ value: isRangeType ? {} : '', is_preset: false })}>
              usar fecha libre
            </button>
          </p>
        )}
      </div>
    )
  }

  if (type === 'enum') {
    const options = (enumOptions || '').split('\n').filter(Boolean)
    return (
      <div className="space-y-1.5">
        <Label>{title || name}</Label>
        <SearchableSelect
          value={cfg.value}
          onChange={v => update({ value: v, is_preset: false })}
          options={options}
          loading={false}
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label>{title || name}</Label>
      <Input
        type={type === 'number' ? 'number' : 'text'}
        value={typeof cfg.value === 'string' ? cfg.value : ''}
        onChange={e => update({ value: e.target.value, is_preset: false })}
        placeholder={title || name}
      />
    </div>
  )
}

export default function JobForm({ job, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:       job?.name       || '',
    query_id:   job?.query_id   || '',
    cron_expr:  job?.cron_expr  || '',
    format:     job?.format     || 'html',
    body:       job?.body       || '',
    active:     job?.active     ?? true,
    group_id:   job?.group_id   || '',
    parameters: job?.parameters ? JSON.parse(job.parameters) : {},
  })
  const [queryParams, setQueryParams] = useState([])
  const [groups, setGroups] = useState([])

  useEffect(() => {
    client.get('/groups/').then(res => setGroups(res.data)).catch(() => {})
  }, [])

  // Load parameters of existing query on mount
  useEffect(() => {
    if (job?.query_id) {
      client.get(`/redash/queries/${job.query_id}`)
        .then(res => setQueryParams(res.data?.options?.parameters || []))
        .catch(() => {})
    }
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleQuerySelect(q) {
    set('query_id', q.id)
    const params = q.options?.parameters || []
    setQueryParams(params)
    // Reset parameters, keeping existing values for same-named params
    const newParams = {}
    params.forEach(p => {
      newParams[p.name] = form.parameters[p.name] || { type: p.type, value: '', is_preset: false }
    })
    set('parameters', newParams)
  }

  function handleParamChange(name, cfg) {
    setForm(f => ({ ...f, parameters: { ...f.parameters, [name]: cfg } }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...form,
      query_id: parseInt(form.query_id),
      group_id: parseInt(form.group_id),
      parameters: Object.keys(form.parameters).length > 0
        ? JSON.stringify(form.parameters)
        : null,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{job ? 'Editar Job' : 'Nuevo Job'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="jname">Nombre</Label>
            <Input id="jname" value={form.name}
              onChange={e => set('name', e.target.value)}
              required placeholder="Reporte semanal ventas" />
          </div>

          <div className="space-y-1.5">
            <Label>Query de Redash</Label>
            <QueryPicker value={form.query_id} onChange={handleQuerySelect} />
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
            <Label>Grupo de destinatarios</Label>
            <SearchableSelect
              value={form.group_id}
              onChange={v => set('group_id', v)}
              options={groups.map(g => ({ label: g.name, value: g.id }))}
              placeholder="Selecciona un grupo..."
            />
          </div>

          <div className="flex flex-col justify-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active}
                onChange={e => set('active', e.target.checked)}
                className="w-4 h-4 accent-violet-600" />
              <span className="text-sm font-medium text-slate-700">Job activo</span>
            </label>
          </div>

          {queryParams.length > 0 && (
            <div className="sm:col-span-2">
              <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">Parámetros de la query</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {queryParams.map(p => (
                    <ParamField
                      key={p.name}
                      param={p}
                      value={form.parameters[p.name]}
                      onChange={handleParamChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

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
