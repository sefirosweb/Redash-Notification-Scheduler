import { useEffect, useState } from 'react'
import client from '../api/client'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'

function formatDate(str) {
  if (!str) return '-'
  try {
    return new Date(str).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return str }
}

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client.get('/logs/')
      .then(res => { setLogs(res.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Historial de envíos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Registro de todos los envíos realizados por el scheduler</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No hay registros todavía.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-slate-900">{log.job_name}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'ok' ? 'success' : 'destructive'}>
                        {log.status === 'ok' ? 'Enviado' : 'Error'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">{log.recipients || '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(log.executed_at)}</TableCell>
                    <TableCell className="text-xs text-red-500 max-w-xs">{log.error_msg || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
