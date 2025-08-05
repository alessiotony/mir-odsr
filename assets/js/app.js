// /assets/js/app.js - PONTO DE ENTRADA PRINCIPAL

import { iniciarAplicacao } from './core/inicializacao.js';
import { setupMobileMenuAndNav } from './core/navegacao.js';

// --- FUNÇÕES DE EFEITOS VISUAIS ---

function setupHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    
    const handleScroll = () => {
        header.classList.toggle('header-scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
}

function setupParticles() {
    const particleContainer = document.getElementById('particles-hero');
    if (particleContainer) {
        tsParticles.load("particles-hero", {
            fullScreen: {enable: false},
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            particles: {
                number: { value: 80, density: { enable: true, area: 800 } },
                color: { value: ["#ffffffff", "#783C00","#e4ca05ff", 
                    "#202adeff", "#e67f12ff", "#19c249ff","#c21919ff"] }, 
                opacity: {
                    value: 0.6,
                    animation: { enable: true, speed: 1, minimumValue: 0.3, sync: false }
                },
                size: {
                    value: { min: 2, max: 8 },
                    animation: { enable: true, speed: 2, minimumValue: 1, sync: false }
                },
                move: {
                    enable: true,
                    speed: { min: 0.2, max: 1 },
                    direction: "none",
                    outModes: { default: "out" },
                    random: true,
                    straight: false
                },
                links: {
                    enable: true,
                    distance: 500,
                    color: "#FFDCC5",
                    opacity: 0.2,
                    width: 1
                }
            },
            interactivity: {
                events: {
                    onHover: { enable: true, mode: "repulse" },
                    onClick: { enable: true, mode: "push" },
                    resize: true
                },
                modes: {
                    repulse: { distance: 100, duration: 0.4 },
                    push: { quantity: 4 }
                }
            },
            detectRetina: true
        });
    }
}


// --- INICIALIZAÇÃO DA APLICAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Iniciando aplicação...");

    // Scripts visuais independentes podem iniciar
    setupParticles();

    // Inicia o carregamento de dados e renderização de conteúdo
    iniciarAplicacao().then(success => {
        if (success) {
            console.log("Conteúdo renderizado. Configurando listeners...");
            // Listeners que dependem do DOM renderizado (header, menu)
            setupMobileMenuAndNav();
            setupHeaderScroll();
        } else {
            console.error("Aplicação não iniciada devido a erros.");
        }
    });
});