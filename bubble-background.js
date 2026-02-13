// Interactive Bubble Background with Logo
class BubbleBackground {
    constructor() {
        this.canvas = document.getElementById('bubble-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.bubbles = [];
        this.mouse = { x: null, y: null };
        this.logo = new Image();
        this.logo.src = 'ebexgramlogo.png';
        this.logoLoaded = false;

        this.logo.onload = () => {
            this.logoLoaded = true;
        };

        this.resize();
        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        const bubbleCount = Math.floor((this.canvas.width * this.canvas.height) / 15000);

        for (let i = 0; i < bubbleCount; i++) {
            this.bubbles.push(this.createBubble());
        }
    }

    createBubble(x = null, y = null) {
        return {
            x: x !== null ? x : Math.random() * this.canvas.width,
            y: y !== null ? y : Math.random() * this.canvas.height,
            radius: Math.random() * 40 + 30,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.3 + 0.15,
            pulseSpeed: Math.random() * 0.02 + 0.01,
            pulsePhase: Math.random() * Math.PI * 2,
            breaking: false,
            breakProgress: 0,
            fragments: []
        };
    }

    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.mouse.x = touch.clientX;
        this.mouse.y = touch.clientY;
        this.handleClick(e);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.mouse.x = touch.clientX;
        this.mouse.y = touch.clientY;
    }

    handleClick(e) {
        const clickX = e.clientX || e.touches[0].clientX;
        const clickY = e.clientY || e.touches[0].clientY;

        this.bubbles.forEach(bubble => {
            const dx = bubble.x - clickX;
            const dy = bubble.y - clickY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bubble.radius && !bubble.breaking) {
                this.breakBubble(bubble);
            }
        });
    }

    breakBubble(bubble) {
        bubble.breaking = true;

        // Create fragments
        const fragmentCount = 8;
        for (let i = 0; i < fragmentCount; i++) {
            const angle = (Math.PI * 2 * i) / fragmentCount;
            bubble.fragments.push({
                x: bubble.x,
                y: bubble.y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: bubble.radius / 3,
                opacity: bubble.opacity
            });
        }
    }

    update() {
        this.bubbles.forEach((bubble, index) => {
            if (bubble.breaking) {
                bubble.breakProgress += 0.05;

                // Update fragments
                bubble.fragments.forEach(fragment => {
                    fragment.x += fragment.vx;
                    fragment.y += fragment.vy;
                    fragment.opacity -= 0.02;
                    fragment.radius *= 0.95;
                });

                // Remove bubble when fully broken
                if (bubble.breakProgress >= 1) {
                    this.bubbles.splice(index, 1);
                    // Create new bubble to maintain count
                    this.bubbles.push(this.createBubble());
                }
                return;
            }

            // Mouse interaction - push away
            if (this.mouse.x !== null) {
                const dx = bubble.x - this.mouse.x;
                const dy = bubble.y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = bubble.radius + 100;

                if (distance < minDistance) {
                    const force = (minDistance - distance) / minDistance;
                    bubble.vx += (dx / distance) * force * 0.3;
                    bubble.vy += (dy / distance) * force * 0.3;
                }
            }

            // Update position
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;

            // Damping
            bubble.vx *= 0.98;
            bubble.vy *= 0.98;

            // Pulse effect
            bubble.pulsePhase += bubble.pulseSpeed;

            // Boundary collision
            if (bubble.x - bubble.radius < 0) {
                bubble.x = bubble.radius;
                bubble.vx *= -0.8;
            }
            if (bubble.x + bubble.radius > this.canvas.width) {
                bubble.x = this.canvas.width - bubble.radius;
                bubble.vx *= -0.8;
            }
            if (bubble.y - bubble.radius < 0) {
                bubble.y = bubble.radius;
                bubble.vy *= -0.8;
            }
            if (bubble.y + bubble.radius > this.canvas.height) {
                bubble.y = this.canvas.height - bubble.radius;
                bubble.vy *= -0.8;
            }

            // Gentle drift
            bubble.vx += (Math.random() - 0.5) * 0.05;
            bubble.vy += (Math.random() - 0.5) * 0.05;

            // Limit velocity
            const maxVelocity = 2;
            const velocity = Math.sqrt(bubble.vx * bubble.vx + bubble.vy * bubble.vy);
            if (velocity > maxVelocity) {
                bubble.vx = (bubble.vx / velocity) * maxVelocity;
                bubble.vy = (bubble.vy / velocity) * maxVelocity;
            }
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.bubbles.forEach(bubble => {
            if (bubble.breaking) {
                // Draw breaking fragments
                bubble.fragments.forEach(fragment => {
                    if (fragment.opacity > 0) {
                        this.ctx.save();
                        this.ctx.globalAlpha = fragment.opacity;

                        // Draw fragment circle
                        const gradient = this.ctx.createRadialGradient(
                            fragment.x, fragment.y, 0,
                            fragment.x, fragment.y, fragment.radius
                        );
                        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
                        gradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)');

                        this.ctx.beginPath();
                        this.ctx.arc(fragment.x, fragment.y, fragment.radius, 0, Math.PI * 2);
                        this.ctx.fillStyle = gradient;
                        this.ctx.fill();

                        this.ctx.restore();
                    }
                });
                return;
            }

            // Calculate pulsing radius
            const pulseAmount = Math.sin(bubble.pulsePhase) * 5;
            const currentRadius = bubble.radius + pulseAmount;

            this.ctx.save();
            this.ctx.globalAlpha = bubble.opacity;

            // Draw bubble gradient
            const gradient = this.ctx.createRadialGradient(
                bubble.x - currentRadius * 0.3,
                bubble.y - currentRadius * 0.3,
                0,
                bubble.x,
                bubble.y,
                currentRadius
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            gradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.2)');
            gradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)');

            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, currentRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Draw bubble rim
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw logo inside bubble if loaded
            if (this.logoLoaded) {
                const logoSize = currentRadius * 1.2;
                this.ctx.globalAlpha = bubble.opacity * 0.8;
                this.ctx.drawImage(
                    this.logo,
                    bubble.x - logoSize / 2,
                    bubble.y - logoSize / 2,
                    logoSize,
                    logoSize
                );
            }

            this.ctx.restore();
        });
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
let bubbleBackground;

function initBubbleBackground() {
    if (document.getElementById('bubble-canvas')) {
        bubbleBackground = new BubbleBackground();
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBubbleBackground);
} else {
    initBubbleBackground();
}
