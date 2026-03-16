export type SpatialPosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'background' | 'foreground'

export interface EditingGraphic {
  id: string
  category: string
  icon: string
  label: string
  description: string
  promptTemplate: (pos: SpatialPosition) => string
  color: string
  hasColorPicker: boolean
  hasTextField: boolean
}

export type { SpatialPosition as Position }

export const editingGraphics: EditingGraphic[] = [
  // Categoría: Elementos Naturales
  {
    id: 'sun',
    category: 'Elementos Naturales',
    icon: '☀️',
    label: 'Sol brillante',
    description: 'Agregar sol brillante con destellos',
    promptTemplate: (pos) => `Add a bright glowing sun at the ${pos} of the image with realistic lens flare and golden light rays`,
    color: '#FFD700',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'moon-stars',
    category: 'Elementos Naturales',
    icon: '🌙',
    label: 'Luna y estrellas',
    description: 'Agregar luna llena con estrellas',
    promptTemplate: (pos) => `Add a full moon with twinkling stars at the ${pos} of the image, creating a magical night sky atmosphere`,
    color: '#F4F6F0',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'rainbow',
    category: 'Elementos Naturales',
    icon: '🌈',
    label: 'Arcoíris',
    description: 'Agregar arcoíris vibrante',
    promptTemplate: (pos) => `Add a vibrant rainbow at the ${pos} of the image with realistic colors and soft edges blending into the sky`,
    color: '#FF6B6B',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'clouds',
    category: 'Elementos Naturales',
    icon: '⛅',
    label: 'Nubes dramáticas',
    description: 'Agregar nubes dramáticas',
    promptTemplate: (pos) => `Add dramatic fluffy clouds at the ${pos} of the image with volumetric lighting and realistic shadows`,
    color: '#E8E8E8',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'waves',
    category: 'Elementos Naturales',
    icon: '🌊',
    label: 'Olas en primer plano',
    description: 'Agregar olas de mar realistas',
    promptTemplate: (pos) => `Add realistic ocean waves at the ${pos} of the image with foam and motion blur effects`,
    color: '#0077B6',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'foliage',
    category: 'Elementos Naturales',
    icon: '🌿',
    label: 'Follaje / plantas',
    description: 'Agregar plantas y follaje',
    promptTemplate: (pos) => `Add lush green foliage and plants at the ${pos} of the image with natural leaf textures and depth`,
    color: '#228B22',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'flowers',
    category: 'Elementos Naturales',
    icon: '🌸',
    label: 'Flores',
    description: 'Agregar flores vibrantes',
    promptTemplate: (pos) => `Add vibrant colorful flowers at the ${pos} of the image with natural blooming and soft petal details`,
    color: '#FF69B4',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'snow',
    category: 'Elementos Naturales',
    icon: '❄️',
    label: 'Nieve',
    description: 'Agregar efecto de nieve',
    promptTemplate: (pos) => `Add falling snowflakes and snow accumulation at the ${pos} of the image with realistic winter atmosphere`,
    color: '#FFFFFF',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'rain',
    category: 'Elementos Naturales',
    icon: '🌧️',
    label: 'Lluvia',
    description: 'Agregar lluvia intensa',
    promptTemplate: (pos) => `Add heavy rain with realistic water droplets and wet surface reflections at the ${pos} of the image`,
    color: '#4169E1',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'fog',
    category: 'Elementos Naturales',
    icon: '🌫️',
    label: 'Niebla / neblina',
    description: 'Agregar niebla realista',
    promptTemplate: (pos) => `Add realistic fog or mist at the ${pos} of the image creating atmospheric depth and mysterious mood`,
    color: '#D3D3D3',
    hasColorPicker: true,
    hasTextField: false
  },

  // Categoría: Transformaciones de Objeto
  {
    id: 'move-object',
    category: 'Transformaciones de Objeto',
    icon: '➡️',
    label: 'Mover elemento aquí',
    description: 'Mover objeto a nueva posición',
    promptTemplate: (pos) => `Move the main subject to the ${pos} of the image while maintaining natural lighting and shadows`,
    color: '#FF6B6B',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'remove-object',
    category: 'Transformaciones de Objeto',
    icon: '❌',
    label: 'Eliminar esto',
    description: 'Eliminar elemento no deseado',
    promptTemplate: () => `Remove the unwanted object or person seamlessly, maintaining natural background and lighting consistency`,
    color: '#FF4444',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'change-color',
    category: 'Transformaciones de Objeto',
    icon: '🔄',
    label: 'Cambiar color',
    description: 'Cambiar color de objeto',
    promptTemplate: () => `Change the color of the main subject to a more vibrant hue while maintaining realistic texture and lighting`,
    color: '#9B59B6',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'enlarge',
    category: 'Transformaciones de Objeto',
    icon: '📏',
    label: 'Hacer más grande',
    description: 'Aumentar tamaño del objeto',
    promptTemplate: () => `Enlarge the main subject while maintaining realistic proportions, natural perspective and proper lighting`,
    color: '#3498DB',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'shrink',
    category: 'Transformaciones de Objeto',
    icon: '📐',
    label: 'Hacer más pequeño',
    description: 'Reducir tamaño del objeto',
    promptTemplate: () => `Resize the main subject smaller while maintaining realistic details, proportions and natural composition`,
    color: '#95A5A6',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'flip-horizontal',
    category: 'Transformaciones de Objeto',
    icon: '🔁',
    label: 'Voltear horizontal',
    description: 'Voltear objeto horizontalmente',
    promptTemplate: () => `Flip the main subject horizontally while maintaining natural lighting direction and shadow consistency`,
    color: '#E67E22',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'change-expression',
    category: 'Transformaciones de Objeto',
    icon: '🎭',
    label: 'Cambiar expresión',
    description: 'Cambiar expresión facial',
    promptTemplate: () => `Change the facial expression of the person to a natural, flattering look while preserving identity and features`,
    color: '#F39C12',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'change-clothing',
    category: 'Transformaciones de Objeto',
    icon: '👗',
    label: 'Cambiar ropa',
    description: 'Cambiar outfit o vestimenta',
    promptTemplate: () => `Change the clothing or outfit to a stylish new look while maintaining natural body pose and lighting`,
    color: '#8E44AD',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'remove-background',
    category: 'Transformaciones de Objeto',
    icon: '✂️',
    label: 'Recortar / eliminar fondo',
    description: 'Eliminar fondo automáticamente',
    promptTemplate: () => `Remove the background and create a clean cutout with smooth edges, preserving the main subject completely`,
    color: '#1ABC9C',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'enhance-details',
    category: 'Transformaciones de Objeto',
    icon: '🪄',
    label: 'Mejorar / restaurar detalle',
    description: 'Mejorar calidad y detalles',
    promptTemplate: () => `Enhance and restore missing details, improve sharpness and natural texture while maintaining photo realism`,
    color: '#2ECC71',
    hasColorPicker: false,
    hasTextField: false
  },

  // Categoría: Iluminación y Atmósfera
  {
    id: 'point-light',
    category: 'Iluminación y Atmósfera',
    icon: '💡',
    label: 'Agregar luz puntual',
    description: 'Agregar fuente de luz artificial',
    promptTemplate: (pos) => `Add a dramatic point light source at the ${pos} of the image creating volumetric rays and realistic shadows`,
    color: '#FFFACD',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'god-rays',
    category: 'Iluminación y Atmósfera',
    icon: '🔦',
    label: 'Rayo de luz / god rays',
    description: 'Agregar rayos de luz dramáticos',
    promptTemplate: (pos) => `Add dramatic god rays or light beams at the ${pos} of the image creating cinematic atmosphere`,
    color: '#FFE4B5',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'sunset',
    category: 'Iluminación y Atmósfera',
    icon: '🌅',
    label: 'Efecto atardecer',
    description: 'Agregar tono de atardecer',
    promptTemplate: () => `Add warm sunset lighting with golden hour tones, soft warm highlights and orange-pink color grading`,
    color: '#FF8C00',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'night-effect',
    category: 'Iluminación y Atmósfera',
    icon: '🌃',
    label: 'Efecto noche',
    description: 'Transformar a escena nocturna',
    promptTemplate: () => `Transform into a night scene with cool blue tones, moonlit lighting and realistic starry sky`,
    color: '#191970',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'color-palette',
    category: 'Iluminación y Atmósfera',
    icon: '🎨',
    label: 'Cambiar paleta de colores',
    description: 'Aplicar nueva paleta de colores',
    promptTemplate: () => `Apply a new vibrant color palette with balanced tones while maintaining natural and realistic appearance`,
    color: '#9B59B6',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'bokeh',
    category: 'Iluminación y Atmósfera',
    icon: '🌫️',
    label: 'Agregar bokeh / desenfoque',
    description: 'Agregar efecto bokeh',
    promptTemplate: () => `Add beautiful bokeh blur effect in the background with soft circular light spots for depth of field`,
    color: '#DDA0DD',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'sparkles',
    category: 'Iluminación y Atmósfera',
    icon: '✨',
    label: 'Agregar brillos / partículas',
    description: 'Agregar partículas brillantes',
    promptTemplate: (pos) => `Add magical sparkles and glowing particles at the ${pos} of the image with soft light effects`,
    color: '#FFD700',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'fire',
    category: 'Iluminación y Atmósfera',
    icon: '🔥',
    label: 'Agregar fuego / llamas',
    description: 'Agregar fuego realista',
    promptTemplate: (pos) => `Add realistic fire and flames at the ${pos} of the image with glowing embers and light casting`,
    color: '#FF4500',
    hasColorPicker: true,
    hasTextField: false
  },
  {
    id: 'motion-blur',
    category: 'Iluminación y Atmósfera',
    icon: '💨',
    label: 'Agregar movimiento / blur cinético',
    description: 'Agregar efecto de movimiento',
    promptTemplate: () => `Add kinetic motion blur effect to create sense of movement and dynamic energy in the scene`,
    color: '#708090',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'vignette',
    category: 'Iluminación y Atmósfera',
    icon: '🌑',
    label: 'Viñeta oscura en bordes',
    description: 'Agregar viñeta dramática',
    promptTemplate: () => `Add dark vignette effect on the edges to draw focus to the center and create dramatic atmosphere`,
    color: '#000000',
    hasColorPicker: false,
    hasTextField: false
  },

  // Categoría: Composición
  {
    id: 'mountains',
    category: 'Composición',
    icon: '🏔️',
    label: 'Cambiar fondo por montañas',
    description: 'Fondo de montañas majestuosas',
    promptTemplate: (pos) => `Replace the background with majestic snow-capped mountains at the ${pos} creating breathtaking landscape`,
    color: '#4A90A4',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'city',
    category: 'Composición',
    icon: '🌆',
    label: 'Cambiar fondo por ciudad',
    description: 'Fondo urbano moderno',
    promptTemplate: (pos) => `Replace the background with a stunning cityscape at the ${pos} featuring modern architecture and city lights`,
    color: '#5D6D7E',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'beach',
    category: 'Composición',
    icon: '🏖️',
    label: 'Cambiar fondo por playa',
    description: 'Fondo de playa tropical',
    promptTemplate: (pos) => `Replace the background with a beautiful tropical beach at the ${pos} with crystal clear water and sandy shore`,
    color: '#40E0D0',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'forest',
    category: 'Composición',
    icon: '🌲',
    label: 'Cambiar fondo por bosque',
    description: 'Fondo de bosque naturall',
    promptTemplate: (pos) => `Replace the background with a lush forest at the ${pos} with tall trees and natural woodland atmosphere`,
    color: '#228B22',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'fireworks',
    category: 'Composición',
    icon: '🎆',
    label: 'Agregar fuegos artificiales',
    description: 'Fuegos artificiales brillantes',
    promptTemplate: (pos) => `Add spectacular fireworks display at the ${pos} of the image with colorful explosions and sparkle effects`,
    color: '#FF1493',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'galaxy',
    category: 'Composición',
    icon: '🌌',
    label: 'Fondo galaxia/espacio',
    description: 'Fondo de espacio sideral',
    promptTemplate: (pos) => `Replace the background with a stunning galaxy and space environment at the ${pos} with nebulae and stars`,
    color: '#191970',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'architecture',
    category: 'Composición',
    icon: '🏛️',
    label: 'Fondo arquitectura clásica',
    description: 'Fondo de arquitectura elegante',
    promptTemplate: (pos) => `Replace the background with classical architecture at the ${pos} featuring elegant columns and timeless design`,
    color: '#D4AF37',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'festive',
    category: 'Composición',
    icon: '🎪',
    label: 'Fondo colorido/festivo',
    description: 'Fondo festivo y colorfull',
    promptTemplate: (pos) => `Replace the background with a colorful festive atmosphere at the ${pos} with vibrant decorations and celebration mood`,
    color: '#FF6B6B',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'reflection',
    category: 'Composición',
    icon: '👤',
    label: 'Agregar reflejo/sombra',
    description: 'Agregar reflejo realista',
    promptTemplate: (pos) => `Add a realistic reflection or shadow at the ${pos} of the main subject with natural lighting integration`,
    color: '#808080',
    hasColorPicker: false,
    hasTextField: false
  },
  {
    id: 'frame',
    category: 'Composición',
    icon: '🖼️',
    label: 'Agregar marco artístico',
    description: 'Agregar marco decorativo',
    promptTemplate: (pos) => `Add an artistic decorative frame around the image at the ${pos} with elegant styling and refined details`,
    color: '#8B4513',
    hasColorPicker: true,
    hasTextField: false
  }
]

export const categories = [...new Set(editingGraphics.map(g => g.category))]
