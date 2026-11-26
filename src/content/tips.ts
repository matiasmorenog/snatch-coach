export const RECORDING_TIPS = [
  {
    title: 'Ángulo: de perfil',
    body: 'Teléfono a 90° de tu costado (perfil), no de frente. Izquierdo o derecho da igual: la app lo infiere sola. De frente la barra tapa el cuerpo y los ángulos mienten.',
  },
  {
    title: 'Altura y distancia',
    body: 'Cámara a la altura de tu cadera/pecho, a 2–3 m. Tiene que entrar: pies, barra en el piso, brazos arriba en el catch y un poco de margen arriba/abajo.',
  },
  {
    title: 'Apoyá el teléfono',
    body: 'Trípode, silla o banco estable. Si se mueve la cámara, el análisis se ensucia. Orientación vertical (portrait).',
  },
  {
    title: 'Luz y ropa',
    body: 'Luz frontal o lateral pareja (nada a contraluz fuerte). Ropa que contraste con el fondo. Evitá gente cruzando el frame.',
  },
  {
    title: 'Un snatch por clip',
    body: 'Countdown → setup quieto → 1 rep → parado overhead → Stop. Max ~20 s. No series enteras en el mismo video.',
  },
  {
    title: 'Plano fijo',
    body: 'No caminés hacia la cámara. Mismo lugar de setup y catch. Barra visible desde el piso hasta el lock.',
  },
  {
    title: 'Video de la galería',
    body: 'Home → Cargar video. iPhone (MOV/HEVC) y Samsung (MP4 con HEVC y a veces HDR10+) son los casos raros más comunes: el archivo parece normal pero el codec adentro complica. En el mismo teléfono suele andar. Si falla: Samsung → Galería compartir/guardar MP4 compatible o apagar “Videos eficientes” en cámara; iPhone → exportar H.264. Evitá MKV/AVI/ProRes.',
  },
] as const;

export const ANALYSIS_EXPLAIN = {
  title: 'Cómo analiza',
  lead: 'Reglas de coaching + geometría del cuerpo. No un video élite ni una IA opaca.',
  blocks: [
    {
      title: 'Esqueleto digital',
      body: 'Del clip sale un “doble” de puntos: hombros, caderas, rodillas, tobillos, muñecas. Ahí miramos el movimiento, no el video pixel a pixel. Por eso el ángulo de grabación importa tanto.',
    },
    {
      title: 'Después, el snatch',
      body: 'Partimos las fases (setup → pull → turnover → catch → stand), medimos ángulos y distancias, y las cruzamos con umbrales de coaching. De ahí salen los cues en español.',
    },
    {
      title: 'Qué no hace (a propósito)',
      body: 'No te pone al lado de un video de un atleta top ni finge haber “aprendido” de miles de snatches. No hay magia negra: hay reglas que se pueden leer, discutir y afinar.',
    },
    {
      title: 'De dónde salen las reglas',
      body: 'Biomecánica y cues de weightlifting / CrossFit. Ej.: cadera abierta antes del turnover; barra cerca del cuerpo en el first pull. “Bien” = checklist de patrones, no un clon perfecto.',
    },
  ],
  status: {
    label: 'PROTOTIPO',
    body: 'La UI y las reglas ya se ven — hoy con demos sintéticos para mostrar el formato. Grabá igual: tu video queda listo para cuando el análisis sobre clip real esté activo. Con snatches tuyos vamos afinando los números juntos.',
  },
} as const;
