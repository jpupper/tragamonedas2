/**
 * SVG Animator - Standalone Module
 * 
 * Usage:
 * 
 * // 1. Include this script in your HTML
 * // <script src="svg-animator.js"></script>
 * 
 * // 2. Create a container element
 * // <div id="my-svg-container"></div>
 * 
 * // 3. Initialize the animation
 * createSVGDrawAnimation(
 *     '#my-svg-container', // or document.getElementById('my-svg-container')
 *     'path/to/your.svg',
 *     {
 *         strokeColor: 'white', // Color of the drawing line
 *         strokeWidth: '3',     // Width of the drawing line
 *         fillColor: 'white',   // Color to fill after drawing
 *         drawDuration: 2.8,    // Duration of line drawing (seconds)
 *         fillDuration: 1.8,    // Duration of fill fade-in (seconds)
 *         strokeFadeDuration: 1.2, // Duration of stroke fading out (seconds)
 *         pathDelay: 60,        // Delay between drawing each path (ms)
 *         fillDelay: 2400,      // Delay before filling starts (ms)
 *         strokeFadeDelay: 600, // Delay before stroke fades out (ms)
 *         removeFill: true,     // Remove original fill from SVG
 *         fadeStroke: true      // Fade out the stroke after filling
 *     },
 *     () => {
 *         console.log('Animation completed!');
 *     }
 * );
 */

/**
 * Configuración por defecto para la animación
 */
const DEFAULT_CONFIG = {
    strokeColor: 'white',
    strokeWidth: '3',
    fillColor: 'white',
    drawDuration: 2.8, // segundos
    fillDuration: 1.8, // segundos
    strokeFadeDuration: 1.2, // segundos
    pathDelay: 60, // milisegundos entre cada path
    fillDelay: 2400, // milisegundos antes de iniciar el fill
    strokeFadeDelay: 600, // milisegundos antes de desvanecer el stroke
    drawEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    fillEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    strokeFadeEasing: 'ease-out',
    removeFill: true, // Remover fill original del SVG
    fadeStroke: true // Desvanecer el stroke después del fill
};

/**
 * Clase para manejar la animación de dibujo de SVG
 */
class SVGDrawAnimation {
    /**
     * @param {HTMLElement} container - Elemento contenedor donde se insertará el SVG
     * @param {string} svgPath - Ruta al archivo SVG
     * @param {Object} config - Configuración personalizada (opcional)
     */
    constructor(container, svgPath, config = {}) {
        this.container = container;
        this.svgPath = svgPath;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.svg = null;
        this.paths = [];
    }

    /**
     * Carga y procesa el SVG
     * @returns {Promise<void>}
     */
    async load() {
        try {
            const response = await fetch(this.svgPath);
            const svgText = await response.text();
            
            // Parsear el SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
            const paths = svgDoc.querySelectorAll('path');
            
            // Procesar paths según configuración
            if (this.config.removeFill) {
                paths.forEach(path => {
                    path.removeAttribute('fill');
                    path.setAttribute('fill', 'none');
                });
            }
            
            // Serializar y insertar en el DOM
            const serializer = new XMLSerializer();
            const modifiedSvgText = serializer.serializeToString(svgDoc.documentElement);
            this.container.innerHTML = modifiedSvgText;
            
            // Guardar referencia al SVG
            this.svg = this.container.querySelector('svg');
            
            if (this.svg) {
                this.svg.style.width = '100%';
                this.svg.style.height = '100%';
                this.paths = Array.from(this.svg.querySelectorAll('path'));
            }
            
            return this;
        } catch (error) {
            console.error('Error loading SVG:', error);
            throw error;
        }
    }

    /**
     * Prepara los paths para la animación de dibujo
     */
    preparePaths() {
        this.paths.forEach(path => {
            const length = path.getTotalLength();
            
            // Configurar el path para animación de dibujo
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            path.style.stroke = this.config.strokeColor;
            path.style.strokeWidth = this.config.strokeWidth;
            path.style.fill = 'none';
        });
    }

    /**
     * Inicia la animación de dibujo
     * @param {Function} onComplete - Callback cuando termina la animación (opcional)
     */
    animate(onComplete) {
        this.preparePaths();
        
        // Esperar un frame para asegurar que los estilos se aplicaron
        requestAnimationFrame(() => {
            // Mostrar el contenedor si tiene clase 'ready'
            this.container.classList.add('ready');
            
            let completedPaths = 0;
            const totalPaths = this.paths.length;
            
            // Animar cada path
            this.paths.forEach((path, index) => {
                setTimeout(() => {
                    // Animar el dibujo del stroke
                    path.style.transition = `stroke-dashoffset ${this.config.drawDuration}s ${this.config.drawEasing}`;
                    path.style.strokeDashoffset = '0';
                    
                    // Después de dibujar, rellenar gradualmente
                    setTimeout(() => {
                        path.style.transition = `fill ${this.config.fillDuration}s ${this.config.fillEasing}`;
                        path.style.fill = this.config.fillColor;
                        
                        // Desvanecer el stroke si está configurado
                        if (this.config.fadeStroke) {
                            setTimeout(() => {
                                path.style.transition = `stroke-width ${this.config.strokeFadeDuration}s ${this.config.strokeFadeEasing}`;
                                path.style.strokeWidth = '0';
                                
                                // Verificar si es el último path
                                completedPaths++;
                                if (completedPaths === totalPaths && onComplete) {
                                    onComplete();
                                }
                            }, this.config.strokeFadeDelay);
                        } else {
                            completedPaths++;
                            if (completedPaths === totalPaths && onComplete) {
                                onComplete();
                            }
                        }
                    }, this.config.fillDelay);
                }, index * this.config.pathDelay);
            });
        });
    }

    /**
     * Método de conveniencia para cargar y animar en un solo paso
     * @param {Function} onComplete - Callback cuando termina la animación (opcional)
     * @returns {Promise<void>}
     */
    async loadAndAnimate(onComplete) {
        await this.load();
        this.animate(onComplete);
    }

    /**
     * Resetea la animación a su estado inicial
     */
    reset() {
        this.paths.forEach(path => {
            const length = path.getTotalLength();
            path.style.strokeDashoffset = length;
            path.style.fill = 'none';
            path.style.strokeWidth = this.config.strokeWidth;
        });
    }

    /**
     * Destruye la instancia y limpia el contenedor
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.svg = null;
        this.paths = [];
    }
}

/**
 * Función helper para crear y ejecutar una animación rápidamente
 * @param {HTMLElement|string} container - Elemento contenedor o selector CSS
 * @param {string} svgPath - Ruta al archivo SVG
 * @param {Object} config - Configuración personalizada (opcional)
 * @param {Function} onComplete - Callback cuando termina la animación (opcional)
 * @returns {Promise<SVGDrawAnimation>}
 */
async function createSVGDrawAnimation(container, svgPath, config = {}, onComplete) {
    const element = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
    
    if (!element) {
        throw new Error('Container element not found');
    }
    
    const animation = new SVGDrawAnimation(element, svgPath, config);
    await animation.loadAndAnimate(onComplete);
    return animation;
}

// Exportar para uso como módulo ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SVGDrawAnimation, createSVGDrawAnimation, DEFAULT_CONFIG };
}

// Exportar para uso global en el navegador
if (typeof window !== 'undefined') {
    window.SVGDrawAnimation = SVGDrawAnimation;
    window.createSVGDrawAnimation = createSVGDrawAnimation;
}
