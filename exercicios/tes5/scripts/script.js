// Sistema de Partículas com Dragão
class Particle {
    constructor(canvas, x, y, isDragon = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = x || Math.random() * canvas.width;
        this.y = y || Math.random() * canvas.height;
        this.isDragon = isDragon;
        this.baseX = this.x;
        this.baseY = this.y;
        this.velocity = {
            x: (Math.random() - 0.5) * (isDragon ? 0.2 : 2),
            y: (Math.random() - 0.5) * (isDragon ? 0.2 : 2)
        };
        this.radius = isDragon ? 2 : Math.random() * 2 + 1;
        this.phase = Math.random() * Math.PI * 2;
    }

    update() {
        if(this.isDragon) {
            this.x = this.baseX + Math.sin(Date.now() * 0.001 + this.phase) * 100;
            this.y = this.baseY + Math.cos(Date.now() * 0.001 + this.phase) * 100;
        } else {
            this.x += this.velocity.x;
            this.y += this.velocity.y;

            if (this.x < 0 || this.x > this.canvas.width) this.velocity.x *= -1;
            if (this.y < 0 || this.y > this.canvas.height) this.velocity.y *= -1;
        }
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.isDragon ? '#ff0000' : '#00ff88';
        this.ctx.fill();
    }
}

class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particlesCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.createDragon();
        this.createBackgroundParticles();
    }

    createDragon() {
        const dragonShape = [
            [50, 50], [60, 45], [70, 40], [80, 45], [90, 50],
            [70, 55], [65, 65], [60, 75], [55, 85], [50, 95],
            [60, 100], [70, 105], [80, 100], [90, 95],
            [75, 85], [85, 80], [95, 75], [105, 70],
            [40, 60], [30, 55], [20, 50],
            [100, 60], [110, 55], [120, 50]
        ];

        const centerX = this.canvas.width/2;
        const centerY = this.canvas.height/2;
        
        dragonShape.forEach(([x, y]) => {
            this.particles.push(new Particle(
                this.canvas,
                centerX + x - 60,
                centerY + y - 75,
                true
            ));
        });
    }

    createBackgroundParticles() {
        for(let i = 0; i < 100; i++) {
            this.particles.push(new Particle(this.canvas));
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.particles = [];
        this.createDragon();
        this.createBackgroundParticles();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        this.drawConnections();
        requestAnimationFrame(() => this.animate());
    }

    drawConnections() {
        this.particles.forEach((p1, i) => {
            this.particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if(dist < 100 && (p1.isDragon || p2.isDragon)) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(255, ${p1.isDragon || p2.isDragon ? '0,0' : '255,136'}, ${1 - dist/100})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            });
        });
    }
}

// Iniciar sistema de partículas
const particleSystem = new ParticleSystem();
particleSystem.animate();

// Navegação suave
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});