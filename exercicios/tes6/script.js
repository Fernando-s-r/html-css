 // Gerenciamento de entradas do usuário
 var Input = {
    keys: [],
    mouse: {
      left: false,
      right: false,
      middle: false,
      x: 0,
      y: 0
    }
  };
  for (var i = 0; i < 230; i++) {
    Input.keys.push(false);
  }
  document.addEventListener("keydown", function(event) {
    Input.keys[event.keyCode] = true;
  });
  document.addEventListener("keyup", function(event) {
    Input.keys[event.keyCode] = false;
  });
  document.addEventListener("mousedown", function(event) {
    if (event.button === 0) { Input.mouse.left = true; }
    if (event.button === 1) { Input.mouse.middle = true; }
    if (event.button === 2) { Input.mouse.right = true; }
  });
  document.addEventListener("mouseup", function(event) {
    if (event.button === 0) { Input.mouse.left = false; }
    if (event.button === 1) { Input.mouse.middle = false; }
    if (event.button === 2) { Input.mouse.right = false; }
  });
  document.addEventListener("mousemove", function(event) {
    Input.mouse.x = event.clientX;
    Input.mouse.y = event.clientY;
  });

  // Configuração do canvas
  var canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "white";
  
  // Classes Necessárias
  var segmentCount = 0;
  class Segment {
    constructor(parent, size, angle, range, stiffness) {
      segmentCount++;
      this.isSegment = true;
      this.parent = parent; // Segmento pai
      if (typeof parent.children == "object") {
        parent.children.push(this);
      }
      this.children = []; // Segmentos conectados a este
      this.size = size; // Distância do pai
      this.relAngle = angle; // Ângulo relativo ao pai
      this.defAngle = angle; // Ângulo padrão
      this.absAngle = parent.absAngle + angle; // Ângulo absoluto
      this.range = range; // Alcance de variação do ângulo
      this.stiffness = stiffness; // Rigidez
      this.updateRelative(false, true);
    }
    updateRelative(iter, flex) {
      this.relAngle = this.relAngle - 2 * Math.PI * Math.floor((this.relAngle - this.defAngle) / (2 * Math.PI) + 0.5);
      if (flex) {
        this.relAngle = Math.min(
          this.defAngle + this.range / 2,
          Math.max(
            this.defAngle - this.range / 2,
            (this.relAngle - this.defAngle) / this.stiffness + this.defAngle
          )
        );
      }
      this.absAngle = this.parent.absAngle + this.relAngle;
      this.x = this.parent.x + Math.cos(this.absAngle) * this.size;
      this.y = this.parent.y + Math.sin(this.absAngle) * this.size;
      if (iter) {
        for (var i = 0; i < this.children.length; i++) {
          this.children[i].updateRelative(iter, flex);
        }
      }
    }
    draw(iter) {
      ctx.beginPath();
      ctx.moveTo(this.parent.x, this.parent.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      if (iter) {
        for (var i = 0; i < this.children.length; i++) {
          this.children[i].draw(true);
        }
      }
    }
    follow(iter) {
      var x = this.parent.x;
      var y = this.parent.y;
      var dist = Math.hypot(this.x - x, this.y - y);
      this.x = x + this.size * (this.x - x) / dist;
      this.y = y + this.size * (this.y - y) / dist;
      this.absAngle = Math.atan2(this.y - y, this.x - x);
      this.relAngle = this.absAngle - this.parent.absAngle;
      this.updateRelative(false, true);
      if (iter) {
        for (var i = 0; i < this.children.length; i++) {
          this.children[i].follow(true);
        }
      }
    }
  }

  class LimbSystem {
    constructor(end, length, speed, creature) {
      this.end = end;
      this.length = Math.max(1, length);
      this.creature = creature;
      this.speed = speed;
      creature.systems.push(this);
      this.nodes = [];
      var node = end;
      for (var i = 0; i < length; i++) {
        this.nodes.unshift(node);
        node = node.parent;
        if (!node.isSegment) {
          this.length = i + 1;
          break;
        }
      }
      this.hip = this.nodes[0].parent;
    }
    moveTo(x, y) {
      this.nodes[0].updateRelative(true, true);
      var dist = Math.hypot(x - this.end.x, y - this.end.y);
      var len = Math.max(0, dist - this.speed);
      for (var i = this.nodes.length - 1; i >= 0; i--) {
        var node = this.nodes[i];
        var ang = Math.atan2(node.y - y, node.x - x);
        node.x = x + len * Math.cos(ang);
        node.y = y + len * Math.sin(ang);
        x = node.x;
        y = node.y;
        len = node.size;
      }
      for (var i = 0; i < this.nodes.length; i++) {
        var node = this.nodes[i];
        node.absAngle = Math.atan2(node.y - node.parent.y, node.x - node.parent.x);
        node.relAngle = node.absAngle - node.parent.absAngle;
        for (var ii = 0; ii < node.children.length; ii++) {
          var childNode = node.children[ii];
          if (!this.nodes.includes(childNode)) {
            childNode.updateRelative(true, false);
          }
        }
      }
    }
    update() {
      this.moveTo(Input.mouse.x, Input.mouse.y);
    }
  }

  class LegSystem extends LimbSystem {
    constructor(end, length, speed, creature) {
      super(end, length, speed, creature);
      this.goalX = end.x;
      this.goalY = end.y;
      this.step = 0; // 0: parado, 1: avançando
      this.forwardness = 0;
      this.reach = 0.9 * Math.hypot(this.end.x - this.hip.x, this.end.y - this.hip.y);
      var relAngle = this.creature.absAngle - Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x);
      relAngle -= 2 * Math.PI * Math.floor(relAngle / (2 * Math.PI) + 0.5);
      this.swing = -relAngle + (2 * (relAngle < 0) - 1) * Math.PI / 2;
      this.swingOffset = this.creature.absAngle - this.hip.absAngle;
    }
    update(x, y) {
      this.moveTo(this.goalX, this.goalY);
      if (this.step === 0) {
        var dist = Math.hypot(this.end.x - this.goalX, this.end.y - this.goalY);
        if (dist > 1) {
          this.step = 1;
          this.goalX = this.hip.x + this.reach * Math.cos(this.swing + this.hip.absAngle + this.swingOffset) + (2 * Math.random() - 1) * this.reach / 2;
          this.goalY = this.hip.y + this.reach * Math.sin(this.swing + this.hip.absAngle + this.swingOffset) + (2 * Math.random() - 1) * this.reach / 2;
        }
      } else if (this.step === 1) {
        var theta = Math.atan2(this.end.y - this.hip.y, this.end.x - this.hip.x) - this.hip.absAngle;
        var dist = Math.hypot(this.end.x - this.hip.x, this.end.y - this.hip.y);
        var forwardness2 = dist * Math.cos(theta);
        var dF = this.forwardness - forwardness2;
        this.forwardness = forwardness2;
        if (dF * dF < 1) {
          this.step = 0;
          this.goalX = this.hip.x + (this.end.x - this.hip.x);
          this.goalY = this.hip.y + (this.end.y - this.hip.y);
        }
      }
    }
  }

  class Creature {
    constructor(x, y, angle, fAccel, fFric, fRes, fThresh, rAccel, rFric, rRes, rThresh) {
      this.x = x;
      this.y = y;
      this.absAngle = angle;
      this.fSpeed = 0;
      this.fAccel = fAccel;
      this.fFric = fFric;
      this.fRes = fRes;
      this.fThresh = fThresh;
      this.rSpeed = 0;
      this.rAccel = rAccel;
      this.rFric = rFric;
      this.rRes = rRes;
      this.rThresh = rThresh;
      this.children = [];
      this.systems = [];
    }
    follow(x, y) {
      var dist = Math.hypot(this.x - x, this.y - y);
      var angle = Math.atan2(y - this.y, x - this.x);
      var accel = this.fAccel;
      if (this.systems.length > 0) {
        var sum = 0;
        for (var i = 0; i < this.systems.length; i++) {
          sum += this.systems[i].step === 0;
        }
        accel *= sum / this.systems.length;
      }
      this.fSpeed += accel * (dist > this.fThresh);
      this.fSpeed *= 1 - this.fRes;
      this.speed = Math.max(0, this.fSpeed - this.fFric);
      var dif = this.absAngle - angle;
      dif -= 2 * Math.PI * Math.floor(dif / (2 * Math.PI) + 0.5);
      if (Math.abs(dif) > this.rThresh && dist > this.fThresh) {
        this.rSpeed -= this.rAccel * (2 * (dif > 0) - 1);
      }
      this.rSpeed *= 1 - this.rRes;
      if (Math.abs(this.rSpeed) > this.rFric) {
        this.rSpeed -= this.rFric * (2 * (this.rSpeed > 0) - 1);
      } else {
        this.rSpeed = 0;
      }
      this.absAngle += this.rSpeed;
      this.absAngle -= 2 * Math.PI * Math.floor(this.absAngle / (2 * Math.PI) + 0.5);
      this.x += this.speed * Math.cos(this.absAngle);
      this.y += this.speed * Math.sin(this.absAngle);
      this.absAngle += Math.PI;
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].follow(true, true);
      }
      for (var i = 0; i < this.systems.length; i++) {
        this.systems[i].update(x, y);
      }
      this.absAngle -= Math.PI;
      this.draw(true);
    }
    draw(iter) {
      var r = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, Math.PI / 4 + this.absAngle, 7 * Math.PI / 4 + this.absAngle);
      ctx.moveTo(this.x + r * Math.cos(7 * Math.PI / 4 + this.absAngle),
                 this.y + r * Math.sin(7 * Math.PI / 4 + this.absAngle));
      ctx.lineTo(this.x + r * Math.cos(this.absAngle) * Math.SQRT2,
                 this.y + r * Math.sin(this.absAngle) * Math.SQRT2);
      ctx.lineTo(this.x + r * Math.cos(Math.PI / 4 + this.absAngle),
                 this.y + r * Math.sin(Math.PI / 4 + this.absAngle));
      ctx.stroke();
      if (iter) {
        for (var i = 0; i < this.children.length; i++) {
          this.children[i].draw(true);
        }
      }
    }
  }

  // Variável para armazenar o intervalo de animação
  var critter, interval;
  function clearSimulation() {
    if (interval) clearInterval(interval);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Função para simulação Simple
  function startSimple() {
    clearSimulation();
    var critter = new Creature(canvas.width / 2, canvas.height / 2, 0, 12, 1, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var node = critter;
    for (var i = 0; i < 128; i++) {
      node = new Segment(node, 8, 0, Math.PI / 2, 1);
    }
    interval = setInterval(function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      critter.follow(Input.mouse.x, Input.mouse.y);
    }, 33);
  }

  // Função para simulação Tentacle
  function startTentacle() {
    clearSimulation();
    critter = new Creature(canvas.width / 2, canvas.height / 2, 0, 12, 1, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var node = critter;
    for (var i = 0; i < 32; i++) {
      node = new Segment(node, 8, 0, 2, 1);
    }
    var tentacle = new LimbSystem(node, 32, 8, critter);
    interval = setInterval(function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      critter.follow(canvas.width / 2, canvas.height / 2);
      ctx.beginPath();
      ctx.arc(Input.mouse.x, Input.mouse.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }, 33);
  }

  // Função para simulação Arm
  function startArm() {
    clearSimulation();
    var critter = new Creature(canvas.width / 2, canvas.height / 2, 0, 12, 1, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    var node = critter;
    for (var i = 0; i < 3; i++) {
      node = new Segment(node, 80, 0, Math.PI, 1);
    }
    var arm = new LimbSystem(node, 3, critter);
    interval = setInterval(function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      critter.follow(canvas.width / 2, canvas.height / 2);
    }, 33);
  }

  // Função para simulação Squid
  function startSquid() {
    clearSimulation();
    var legNum = 8;
    var jointNum = 32;
    critter = new Creature(canvas.width / 2, canvas.height / 2, 0, 20, 6, 0.5, 16, 0.5, 0.085, 0.5, 0.3);
    for (var i = 0; i < legNum; i++) {
      var node = critter;
      var ang = Math.PI / 2 * (i / (legNum - 1) - 0.5);
      for (var ii = 0; ii < jointNum; ii++) {
        node = new Segment(node, 128 / jointNum, (ii === 0 ? ang : 0), Math.PI, 1.2);
      }
      var leg = new LegSystem(node, jointNum, 30, critter);
    }
    interval = setInterval(function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      critter.follow(Input.mouse.x, Input.mouse.y);
    }, 33);
  }

  // Função para simulação Lizard
  function startLizard() {
    clearSimulation();
    var legNum = Math.floor(1 + Math.random() * 12);
    critter = new Creature(
      canvas.width / 2,
      canvas.height / 2,
      0,
      8 * 10 / Math.sqrt(legNum),
      8 * 2 / Math.sqrt(legNum),
      0.5,
      16,
      0.5,
      0.085,
      0.5,
      0.3
    );
    var s = 8 / Math.sqrt(legNum);
    var spinal = critter;
    // Pescoço
    for (var i = 0; i < 6; i++) {
      spinal = new Segment(spinal, s * 4, 0, (2 * Math.PI * 2 / 3), 1.1);
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 3, ii, 0.1, 2);
        for (var iii = 0; iii < 3; iii++) {
          node = new Segment(node, s * 0.1, -ii * 0.1, 0.1, 2);
        }
      }
    }
    // Tronco e pernas
    for (var i = 0; i < legNum; i++) {
      if (i > 0) {
        for (var ii = 0; ii < 6; ii++) {
          spinal = new Segment(spinal, s * 4, 0, 1.571, 1.5);
          for (var iii = -1; iii <= 1; iii += 2) {
            var node = new Segment(spinal, s * 3, iii * 1.571, 0.1, 1.5);
            for (var iv = 0; iv < 3; iv++) {
              node = new Segment(node, s * 3, -iii * 0.3, 0.1, 2);
            }
          }
        }
      }
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 12, ii * 0.785, 0, 8);
        node = new Segment(node, s * 16, -ii * 0.785, 6.28, 1);
        node = new Segment(node, s * 16, ii * 1.571, 3.1416, 2);
        for (var iii = 0; iii < 4; iii++) {
          new Segment(node, s * 4, (iii / 3 - 0.5) * 1.571, 0.1, 4);
        }
        new LegSystem(node, 3, s * 12, critter);
      }
    }
    // Cauda
    var tailLength = Math.floor(4 + Math.random() * legNum * 8);
    for (var i = 0; i < tailLength; i++) {
      spinal = new Segment(spinal, s * 4, 0, (2 * Math.PI * 2 / 3), 1.1);
      for (var ii = -1; ii <= 1; ii += 2) {
        var node = new Segment(spinal, s * 3, ii, 0.1, 2);
        for (var iii = 0; iii < 3; iii++) {
          node = new Segment(node, s * 3 * ((tailLength - i) / tailLength), -ii * 0.1, 0.1, 2);
        }
      }
    }
    interval = setInterval(function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      critter.follow(Input.mouse.x, Input.mouse.y);
    }, 33);
  }

  // Inicia a simulação padrão (Lizard)
  startLizard();

  // Ajusta o tamanho do canvas ao redimensionar a janela
  window.addEventListener("resize", function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });



  //menu
  const hamburger = document.querySelector('.hamburger');
  const sidebar = document.querySelector('.sidebar');
  const navLinks = document.querySelectorAll('.nav-links a');

  // Toggle menu
  hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      sidebar.classList.toggle('active');
  });

  // Fechar menu ao clicar em um link
  navLinks.forEach(link => {
      link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
              hamburger.classList.remove('active');
              sidebar.classList.remove('active');
          }
      });
  });

  // Fechar menu ao clicar fora
  document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && 
          !sidebar.contains(e.target) && 
          !hamburger.contains(e.target)) {
          hamburger.classList.remove('active');
          sidebar.classList.remove('active');
      }
  });

  // Atualizar o evento de redimensionamento existente
  window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
          hamburger.classList.remove('active');
          sidebar.classList.remove('active');
      }
  });

  // novo
  // No final do seu script.js
window.addEventListener('scroll', function() {
  // Força redimensionamento durante a rolagem
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Atualiza posições relativas
  critter.x = canvas.width / 2;
  critter.y = canvas.height / 2;
});

// Adicione este trecho na função de redimensionamento existente
window.addEventListener('resize', function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  critter.x = canvas.width / 2;
  critter.y = canvas.height / 2;
});


// --

// No final do seu script.js
let lastScrollY = 0;

function handleScroll() {
    // Atualiza posição relativa ao scroll
    critter.y = (window.innerHeight / 2) + window.scrollY;
    
    // Força redesenho contínuo
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight; // Altura total da página
    
    // Atualiza a cada frame
    requestAnimationFrame(() => {
        critter.follow(Input.mouse.x, Input.mouse.y + window.scrollY);
    });
}

// Atualiza o listener de scroll
window.addEventListener('scroll', handleScroll);

// Modifique a função de resize existente
window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight;
    critter.x = window.innerWidth / 2;
    critter.y = (window.innerHeight / 2) + window.scrollY;
});