  // Inicialização
  document.addEventListener('DOMContentLoaded', () => {
    AOS.init({ duration: 1000, once: true });

    // Sistema de Tema
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Verificar tema salvo
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    body.classList.add(savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark-mode' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

    // Alternar tema
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark-mode' : 'light-mode');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    // Menu Mobile
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('toggle');
    });

    // Fechar menu ao clicar nos links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            hamburger.classList.remove('toggle');
        });
    });

    // Formulário
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Substitua pelo seu ID do Formspree
            const response = await fetch('https://formspree.io/f/SEU_ID_AQUI', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    message: document.getElementById('message').value
                })
            });

            if(response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Mensagem Enviada!',
                    text: 'Retornarei em até 24 horas'
                });
                document.getElementById('contactForm').reset();
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Ocorreu um erro ao enviar. Tente novamente mais tarde.'
            });
        }
    });
});