import React, { useEffect, useRef } from 'react';

export function FallingPetals({ active = true, type = 'petals', isAbsolute = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const parent = canvas.parentElement;
    let width = (canvas.width = isAbsolute && parent ? parent.clientWidth : window.innerWidth);
    let height = (canvas.height = isAbsolute && parent ? parent.clientHeight : window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      const p = canvas.parentElement;
      width = canvas.width = isAbsolute && p ? p.clientWidth : window.innerWidth;
      height = canvas.height = isAbsolute && p ? p.clientHeight : window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Number of falling petals based on screen size
    const count = window.innerWidth < 640 ? 18 : 28;
    const particles = [];

    const colors = [
      'rgba(244, 63, 94, 0.65)',   // rose-500
      'rgba(251, 113, 133, 0.65)', // rose-400
      'rgba(254, 205, 211, 0.75)', // rose-200
      'rgba(251, 191, 36, 0.55)',  // amber-400 (gold dust)
    ];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        size: Math.random() * 8 + 6,
        speedX: Math.random() * 1.5 - 0.75,
        speedY: Math.random() * 1.2 + 0.8,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        swing: Math.random() * 2 * Math.PI,
        swingSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.swing += p.swingSpeed;
        p.x += Math.sin(p.swing) * 0.8 + p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        // Draw curved rose petal
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, type]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`${isAbsolute ? 'absolute' : 'fixed'} inset-0 pointer-events-none z-30 opacity-80`}
    />
  );
}
