// ============================================================
// RANKETES · supabase.js v2
// Integração completa com Supabase
// ============================================================

const SUPABASE_URL = 'https://plkitfryokasvewpneje.supabase.co'
const SUPABASE_KEY = 'sb_publishable_6b6C6WLvS1L61QaIUnqRFQ_9NHy42HL'

const _script = document.createElement('script')
_script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
_script.onload = () => {
  window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('✅ Supabase conectado!')
  document.dispatchEvent(new Event('supabase:ready'))
}
document.head.appendChild(_script)

const db = () => window._sb

// ============================================================
// AUTH
// ============================================================

async function cadastrar(email, senha, nome, tipo, extras = {}) {
  const { data, error } = await db().auth.signUp({
    email, password: senha,
    options: { data: { nome, tipo, ...extras } }
  })
  if (error) throw error
  if (data.user) {
    await db().from('usuarios').upsert({
      id: data.user.id, email, nome, tipo,
      genero: extras.genero || null,
      arena_id: extras.arena_id || null,
    })
  }
  return data
}

async function login(email, senha) {
  const { data, error } = await db().auth.signInWithPassword({ email, password: senha })
  if (error) throw error
  return data
}

async function logout() {
  await db().auth.signOut()
  window.location.href = 'ranketes_login.html'
}

async function usuarioLogado() {
  const { data } = await db().auth.getSession()
  return data.session?.user || null
}

async function protegerPagina(tipoRequerido = null) {
  const u = await usuarioLogado()
  if (!u) { window.location.href = 'ranketes_login.html'; return null }
  if (tipoRequerido && u.user_metadata?.tipo !== tipoRequerido) {
    window.location.href = 'ranketes_login.html'; return null
  }
  return u
}

function mostrarErro(msg) {
  const map = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'User already registered': 'Este e-mail já está cadastrado.',
    'Password should be at least 6 characters': 'Senha precisa ter no mínimo 6 caracteres.'
  }
  return map[msg] || msg
}

// ============================================================
// ARENAS
// ============================================================

async function buscarArena(id) {
  const { data, error } = await db().from('arenas').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

async function buscarArenaDoUsuario() {
  const u = await usuarioLogado()
  if (!u) return null
  const { data } = await db().from('usuarios').select('arena_id').eq('id', u.id).single()
  if (!data?.arena_id) return null
  return buscarArena(data.arena_id)
}

async function atualizarArena(id, dados) {
  const { data, error } = await db().from('arenas').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function buscarTodasArenas(busca = '') {
  let q = db().from('arenas').select('id,nome,cidade,estado,modalidades').eq('ativa', true)
  if (busca) q = q.ilike('nome', `%${busca}%`)
  const { data, error } = await q.order('nome')
  if (error) throw error
  return data || []
}

// ============================================================
// CATEGORIAS
// ============================================================

async function listarCategorias(arenaId) {
  const { data, error } = await db().from('categorias')
    .select('*').eq('arena_id', arenaId).eq('ativa', true).order('nome')
  if (error) throw error
  return data || []
}

async function criarCategoria(dados) {
  const { data, error } = await db().from('categorias').insert([dados]).select().single()
  if (error) throw error
  return data
}

async function atualizarCategoria(id, dados) {
  const { data, error } = await db().from('categorias').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ============================================================
// ATLETAS
// ============================================================

async function listarAtletas(arenaId, filtros = {}) {
  let q = db().from('atletas')
    .select('*, usuarios!inner(id,nome,email,telefone,genero,foto_url), categorias(nome)')
    .eq('arena_id', arenaId)
  if (filtros.status) q = q.eq('status', filtros.status)
  if (filtros.genero) q = q.eq('genero', filtros.genero)
  if (filtros.modalidade) q = q.eq('modalidade', filtros.modalidade)
  if (filtros.categoria_id) q = q.eq('categoria_id', filtros.categoria_id)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

async function buscarAtleta(id) {
  const { data, error } = await db().from('atletas')
    .select('*, usuarios(*), categorias(nome)').eq('id', id).single()
  if (error) throw error
  return data
}

async function criarAtletaDireto(dadosUsuario, dadosAtleta, arenaId) {
  // Gera UUID para o usuário
  const userId = crypto.randomUUID()
  
  // Clube cria atleta diretamente (sem convite)
  const { data: u, error: uErr } = await db().from('usuarios')
    .insert([{ id: userId, ...dadosUsuario, tipo: 'athlete', arena_id: arenaId }])
    .select().single()
  if (uErr) throw uErr
  
  const { data, error } = await db().from('atletas')
    .insert([{ ...dadosAtleta, usuario_id: u.id, arena_id: arenaId }])
    .select().single()
  if (error) throw error
  return data
}

async function atualizarAtleta(id, dados) {
  const { data, error } = await db().from('atletas').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ============================================================
// PROFESSORES
// ============================================================

async function listarProfessores(arenaId) {
  const { data, error } = await db().from('professores')
    .select('*, usuarios!inner(id,nome,email,telefone,genero,foto_url)')
    .eq('arena_id', arenaId).eq('ativo', true)
  if (error) throw error
  return data || []
}

async function buscarProfessor(id) {
  const { data, error } = await db().from('professores')
    .select('*, usuarios(*)').eq('id', id).single()
  if (error) throw error
  return data
}

async function criarProfessorDireto(dadosUsuario, dadosProfessor, arenaId) {
  const userId = crypto.randomUUID()
  const { data: u, error: uErr } = await db().from('usuarios')
    .insert([{ id: userId, ...dadosUsuario, tipo: 'prof', arena_id: arenaId }])
    .select().single()
  if (uErr) throw uErr
  const { data, error } = await db().from('professores')
    .insert([{ ...dadosProfessor, usuario_id: u.id, arena_id: arenaId }])
    .select().single()
  if (error) throw error
  return data
}

async function atualizarProfessor(id, dados) {
  const { data, error } = await db().from('professores').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ============================================================
// QUADRAS
// ============================================================

async function listarQuadras(arenaId) {
  const { data, error } = await db().from('quadras')
    .select('*').eq('arena_id', arenaId).eq('ativa', true).order('nome')
  if (error) throw error
  return data || []
}

async function criarQuadra(dados) {
  const { data, error } = await db().from('quadras').insert([dados]).select().single()
  if (error) throw error
  return data
}

async function atualizarQuadra(id, dados) {
  const { data, error } = await db().from('quadras').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

function gerarSlots(quadra, data) {
  const slots = []
  const dt = new Date(data + 'T12:00:00')
  const dia = dt.getDay()
  const isFds = dia === 0 || dia === 6
  if (isFds && dia === 6 && !quadra.sabado) return []
  if (isFds && dia === 0 && !quadra.domingo) return []
  if (!isFds && !quadra.dias_uteis) return []
  const inicio = isFds ? quadra.hora_inicio_fds : quadra.hora_inicio_util
  const fim    = isFds ? quadra.hora_fim_fds    : quadra.hora_fim_util
  const dur    = isFds ? quadra.duracao_aula_fds : quadra.duracao_aula
  let [h, m] = inicio.split(':').map(Number)
  const [hf, mf] = fim.split(':').map(Number)
  while (h * 60 + m + dur <= hf * 60 + mf) {
    const hi = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    const ef = h * 60 + m + dur
    const hf2 = `${String(Math.floor(ef/60)).padStart(2,'0')}:${String(ef%60).padStart(2,'0')}`
    slots.push({ hora_inicio: hi, hora_fim: hf2, disponivel: true })
    m += dur; h += Math.floor(m/60); m %= 60
  }
  return slots
}

// ============================================================
// PREÇOS
// ============================================================

async function listarPrecos(arenaId) {
  const { data, error } = await db().from('precos').select('*')
    .eq('arena_id', arenaId).order('modalidade').order('tipo_aula').order('frequencia')
  if (error) throw error
  return data || []
}

async function salvarPreco(arenaId, modalidade, tipoAula, frequencia, valorAula, valorMensal) {
  const { data, error } = await db().from('precos').upsert({
    arena_id: arenaId, modalidade, tipo_aula: tipoAula,
    frequencia, valor_aula: valorAula, valor_mensal: valorMensal
  }, { onConflict: 'arena_id,modalidade,tipo_aula,frequencia' }).select().single()
  if (error) throw error
  return data
}

// ============================================================
// AGENDA
// ============================================================

async function buscarAgenda(arenaId, data, quadraId = null) {
  let q = db().from('aulas_agenda')
    .select('*, quadras(nome), professores(id,usuarios(nome)), atletas(id,usuarios(nome))')
    .eq('arena_id', arenaId).eq('data_aula', data)
  if (quadraId) q = q.eq('quadra_id', quadraId)
  const { data: d, error } = await q.order('hora_inicio')
  if (error) throw error
  return d || []
}

async function criarAgendamento(dados) {
  const { data, error } = await db().from('aulas_agenda').insert([dados]).select().single()
  if (error) throw error
  return data
}

async function cancelarAgendamento(id) {
  const { data, error } = await db().from('aulas_agenda')
    .update({ status: 'cancelado' }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ============================================================
// PARTIDAS
// ============================================================

async function registrarPartida(dados, peloClube = true) {
  const { data, error } = await db().from('partidas').insert([{
    ...dados,
    registrado_por: peloClube ? 'clube' : 'atleta',
    confirmada: peloClube
  }]).select().single()
  if (error) throw error
  return data
}

async function confirmarPartida(id, usuarioId) {
  const { data, error } = await db().from('partidas').update({
    confirmada: true,
    confirmada_por: usuarioId,
    confirmada_em: new Date().toISOString()
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function listarPartidas(arenaId, filtros = {}) {
  let q = db().from('partidas').select(`
    *,
    vencedor:atletas!vencedor_id(id,usuarios(nome,foto_url)),
    perdedor:atletas!perdedor_id(id,usuarios(nome,foto_url)),
    categorias(nome)
  `).eq('arena_id', arenaId)
  if (filtros.modalidade) q = q.eq('modalidade', filtros.modalidade)
  if (filtros.confirmada !== undefined) q = q.eq('confirmada', filtros.confirmada)
  if (filtros.atleta_id) q = q.or(`vencedor_id.eq.${filtros.atleta_id},perdedor_id.eq.${filtros.atleta_id}`)
  if (filtros.data_inicio) q = q.gte('data_partida', filtros.data_inicio)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(filtros.limit || 50)
  if (error) throw error
  return data || []
}

async function buscarH2H(id1, id2) {
  const { data, error } = await db().from('partidas').select('*').eq('confirmada', true).or(
    `and(vencedor_id.eq.${id1},perdedor_id.eq.${id2}),and(vencedor_id.eq.${id2},perdedor_id.eq.${id1})`
  ).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ============================================================
// RANKING
// ============================================================

async function buscarRanking(arenaId, modalidade = 'tenis', genero = null, categoriaId = null) {
  const view = modalidade === 'beach_tennis' ? 'vw_ranking_bt' : 'vw_ranking_tenis'
  let q = db().from(view).select('*').eq('arena_id', arenaId)
  if (genero) q = q.eq('genero', genero)
  if (categoriaId) q = q.eq('categoria_id', categoriaId)
  const { data, error } = await q.order('posicao')
  if (error) throw error
  return data || []
}

// ============================================================
// PAGAMENTOS
// ============================================================

async function listarPagamentos(arenaId, filtros = {}) {
  let q = db().from('pagamentos')
    .select('*, atletas(id,usuarios(nome,foto_url))').eq('arena_id', arenaId)
  if (filtros.status) q = q.eq('status', filtros.status)
  if (filtros.atleta_id) q = q.eq('atleta_id', filtros.atleta_id)
  if (filtros.tipo) q = q.eq('tipo', filtros.tipo)
  if (filtros.mes) q = q.eq('referencia_mes', filtros.mes)
  const { data, error } = await q.order('vencimento')
  if (error) throw error
  return data || []
}

async function criarPagamento(dados) {
  const { data, error } = await db().from('pagamentos').insert([dados]).select().single()
  if (error) throw error
  return data
}

async function marcarComoPago(id, forma = 'pix') {
  const pg = await db().from('pagamentos').select('valor').eq('id', id).single()
  const { data, error } = await db().from('pagamentos').update({
    status: 'pago',
    valor_pago: pg.data?.valor || 0,
    pago_em: new Date().toISOString().split('T')[0],
    forma_pagamento: forma
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function atualizarPagamento(id, dados) {
  const { data, error } = await db().from('pagamentos').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function gerarCobrancasMensais(arenaId, mes) {
  const { data, error } = await db().rpc('gerar_cobrancas_mensais', { p_arena_id: arenaId, p_mes: mes })
  if (error) throw error
  return data
}

async function resumoFinanceiro(arenaId) {
  const { data, error } = await db().from('vw_financeiro_resumo').select('*').eq('arena_id', arenaId).single()
  if (error) return { receita_total: 0, a_receber: 0, em_atraso: 0, total_atrasados: 0 }
  return data
}

async function atualizarAtrasados(arenaId) {
  const hoje = new Date().toISOString().split('T')[0]
  await db().from('pagamentos').update({ status: 'atrasado' })
    .eq('arena_id', arenaId).eq('status', 'pendente').lt('vencimento', hoje)
}

// ============================================================
// DASHBOARD STATS
// ============================================================

async function statsDashboard(arenaId) {
  const [a, t, p, f] = await Promise.all([
    db().from('atletas').select('id', { count: 'exact', head: true }).eq('arena_id', arenaId).eq('status', 'ativo'),
    db().from('torneios').select('id', { count: 'exact', head: true }).eq('arena_id', arenaId).eq('status', 'ativo'),
    db().from('partidas').select('id', { count: 'exact', head: true }).eq('arena_id', arenaId)
      .gte('data_partida', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    resumoFinanceiro(arenaId)
  ])
  return {
    atletas: a.count || 0,
    torneios: t.count || 0,
    partidas_mes: p.count || 0,
    receita_mes: f?.receita_total || 0
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function formatarReais(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function formatarData(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function getIniciais(nome) {
  if (!nome) return '??'
  return nome.split(' ').filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('')
}

function statusBadge(status) {
  const map = {
    ativo:      '<span class="badge badge-green">Ativo</span>',
    inativo:    '<span class="badge badge-gray">Inativo</span>',
    pendente:   '<span class="badge badge-yellow">Pendente</span>',
    pago:       '<span class="badge badge-green">Pago</span>',
    atrasado:   '<span class="badge badge-red">Atrasado</span>',
    cancelado:  '<span class="badge badge-gray">Cancelado</span>',
    agendado:   '<span class="badge badge-blue">Agendado</span>',
    confirmado: '<span class="badge badge-green">Confirmado</span>',
    concluido:  '<span class="badge badge-gray">Concluído</span>',
  }
  return map[status] || `<span class="badge badge-gray">${status}</span>`
}
