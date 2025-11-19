let LM;
let pointHoverStates = new Map(); // Track dwell time per point ID

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style('position', 'fixed');
  canvas.style('top', '0');
  canvas.style('left', '0');
  canvas.style('pointer-events', 'none');
  canvas.style('z-index', '99999');
  LM = new PointServer();
  console.log('PointServer inicializado');
}

function draw() {
  clear(); // Fondo transparente en lugar de negro

  LM.display();
  LM.update();
  
  // Recolectar elementos interactivos visibles
  let elementsToCheck = [];

  // 1. Index: Botón comenzar
  const btnComenzar = document.querySelector('.btn-comenzar');
  // offsetParent es válido para elementos no fixed. El botón no es fixed.
  if (btnComenzar && btnComenzar.offsetParent !== null) {
      elementsToCheck.push(btnComenzar);
  }

  // 2. Game: Tutorial Popups
  // Los popups son position: fixed, por lo que offsetParent es null. 
  // Confiamos en la clase .active.
  const activePopup = document.querySelector('.tutorial-popup.active');
  if (activePopup) {
      elementsToCheck.push(activePopup);
  }

  // 3. Game: Tarjetas de selección
  // La pantalla de selección también es fixed.
  const selectionScreen = document.getElementById('selection-screen');
  if (selectionScreen && selectionScreen.classList.contains('active')) {
      const cards = document.querySelectorAll('.selection-card');
      cards.forEach(card => elementsToCheck.push(card));
  }
  
  const points = LM.getAllPoints();
  const currentFrameIds = new Set();
  
  for (let point of points) {
    currentFrameIds.add(point.id);
    let hoveredEl = null;

    // Verificar colisión con elementos interactivos
    for (let el of elementsToCheck) {
        const rect = el.getBoundingClientRect();
        if (point.x >= rect.left && point.x <= rect.right && 
            point.y >= rect.top && point.y <= rect.bottom) {
            hoveredEl = el;
            break; // Solo interactuar con un elemento a la vez
        }
    }

    if (hoveredEl) {
        // Iniciar o recuperar estado
        if (!pointHoverStates.has(point.id)) {
             pointHoverStates.set(point.id, { time: 0, element: hoveredEl });
        }

        let state = pointHoverStates.get(point.id);
        
        // Si cambió el elemento bajo el punto (ej. mover rápido entre botones), reiniciar
        // O si guardamos solo tiempo, se reiniciaba. Aquí aseguramos consistencia.
        if (state.element !== hoveredEl) {
            state = { time: 0, element: hoveredEl };
            pointHoverStates.set(point.id, state);
        }

        // Incrementar tiempo
        state.time += deltaTime;
        
        // Calcular progreso
        let progress = Math.min(state.time / LM.dur, 1);

        // Visualizar arco
        noFill();
        stroke(0, 255, 0); // Verde
        strokeWeight(5);
        arc(point.x, point.y, 60, 60, -HALF_PI, -HALF_PI + TWO_PI * progress);

        // Trigger click si se completó el tiempo
        if (progress >= 1) {
            hoveredEl.click();
            pointHoverStates.delete(point.id); // Reiniciar tras click
        }

    } else {
        // No hay hover sobre nada interactivo
        pointHoverStates.delete(point.id);
    }
  }

  // Limpiar estados de puntos que ya no existen
  for (let id of pointHoverStates.keys()) {
      if (!currentFrameIds.has(id)) {
          pointHoverStates.delete(id);
      }
  }
}

// Touch event handlers for p5.js
function touchStarted() {
  // Allow default behavior for touch events
  return true;
}

function touchMoved() {
  // Allow default behavior for touch events
  return true;
}

function touchEnded() {
  // Allow default behavior for touch events
  return true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class PointServer {
    constructor() {
        this.points = []; //lidarpoints
        this.inputPoints = []; // Array separado para mouse/touch
        
        // Inicializar con algunos puntos de ejemplo
        //this.points.push(new LidarPoint(width/2, height*1/4, 0));
        //this.points.push(new LidarPoint(width/2, height/2, 1));
        //this.points.push(new LidarPoint(width/2, height*3/4, 2));

        this.dur = 500;
    }
    display() {
        // Dibujamos todos los puntos (LIDAR + input)
        const allPoints = [...this.points, ...this.inputPoints];

        fill(255);
        textSize(30);
        text(`Puntos Totales: ${allPoints.length}`, 40, 40);
      
        for (let i = 0; i < allPoints.length; i++) {
            fill(255, 0, 0);
            ellipse(allPoints[i].x, allPoints[i].y, 30, 30);
            fill(255);
            ellipse(allPoints[i].x, allPoints[i].y, 15,15);
        }
        return allPoints;
    }
    getAllPoints(){
        return [...this.points, ...this.inputPoints];
    }
    update() {
        this.inputPoints = []; // Reset input points

        // Mouse tracking
        if (mouseIsPressed) {
            this.inputPoints.push(new LidarPoint(mouseX, mouseY, -1));
        }

        // Touch tracking
        for (let i = 0; i < touches.length; i++) {
            this.inputPoints.push(new LidarPoint(touches[i].x, touches[i].y, -i-2));
        }
    }

    //PUNTOS DEL LIDAR :::::
    processJSONtouch(_json){
        // Verificar si el JSON es válido
        if (!_json || !_json.points || !Array.isArray(_json.points)) {
            console.error('JSON inválido o no contiene puntos');
            return;
        }

        // Crear un mapa de los puntos actuales por ID para búsqueda rápida
        const currentPointsMap = {};
        for (let i = 0; i < this.points.length; i++) {
            currentPointsMap[this.points[i].id] = i;
        }

        // Crear un conjunto de IDs del nuevo JSON para verificar qué puntos eliminar
        const newPointIds = new Set();
        _json.points.forEach(point => {
            newPointIds.add(point.id);
        });

        // Eliminar puntos que ya no existen en el nuevo JSON
        for (let i = this.points.length - 1; i >= 0; i--) {
            if (!newPointIds.has(this.points[i].id)) {
                this.points.splice(i, 1);
            }
        }

        // Actualizar puntos existentes o crear nuevos
        _json.points.forEach(point => {
            const index = currentPointsMap[point.id];
            
            if (index !== undefined) {
                // Actualizar punto existente
                this.points[index].x = map(point.x,1,0,0,width) ;
                this.points[index].y = map(point.y,1,0,0,height) ;
            } else {
                // Crear nuevo punto
                this.points.push(new LidarPoint(point.x * width, point.y * height, point.id));
            }
        });

        console.log(`Procesados ${_json.total_points} puntos. Puntos actuales: ${this.points.length}`);
    }

}

class LidarPoint{
    constructor(_x,_y,_id){
        this.x = _x;
        this.y = _y;
        this.id = _id;
    }
    
    set(newX, newY) {
        this.x = newX;
        this.y = newY;
    }
}
