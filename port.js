 class FloatingCodeSystem {
            constructor() {
                this.canvas = document.getElementById('particles-canvas');
                this.ctx = this.canvas.getContext('2d');
                this.codeElements = [];
                this.mouse = { x: 0, y: 0 };
                
                // Code symbols and elements to float
                this.symbols = [
                    '{ }', '< >', '[ ]', '( )', 
                    '</>', '<div>', 'const', 'let', 'var',
                    '=>', '===', '!==', '&&', '||',
                    'function', 'return', 'if', 'else',
                    'React', 'Node', 'JS', 'CSS', 'HTML',
                    '💻', '⚡', '🚀', '🔥', '✨', '🎯'
                ];
                
                this.resize();
                this.init();
                this.animate();
                
                window.addEventListener('resize', () => this.resize());
                window.addEventListener('mousemove', (e) => {
                    this.mouse.x = e.clientX;
                    this.mouse.y = e.clientY;
                });
            }
            
            resize() {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
            
            init() {
                for (let i = 0; i < 30; i++) {
                    this.codeElements.push({
                        x: Math.random() * this.canvas.width,
                        y: Math.random() * this.canvas.height,
                        vx: (Math.random() - 0.5) * 0.8,
                        vy: (Math.random() - 0.5) * 0.8,
                        symbol: this.symbols[Math.floor(Math.random() * this.symbols.length)],
                        size: Math.random() * 8 + 12,
                        color: ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'][Math.floor(Math.random() * 4)],
                        rotation: Math.random() * 360,
                        rotationSpeed: (Math.random() - 0.5) * 2,
                        opacity: Math.random() * 0.6 + 0.3
                    });
                }
            }
            
            animate() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.codeElements.forEach(element => {
                    // Mouse interaction - gentle repulsion
                    const dx = this.mouse.x - element.x;
                    const dy = this.mouse.y - element.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 120) {
                        const force = (120 - distance) / 120;
                        element.vx -= dx * force * 0.0008;
                        element.vy -= dy * force * 0.0008;
                    }
                    
                    // Update position
                    element.x += element.vx;
                    element.y += element.vy;
                    element.rotation += element.rotationSpeed;
                    
                    // Boundary check with wrapping
                    if (element.x < -50) element.x = this.canvas.width + 50;
                    if (element.x > this.canvas.width + 50) element.x = -50;
                    if (element.y < -50) element.y = this.canvas.height + 50;
                    if (element.y > this.canvas.height + 50) element.y = -50;
                    
                    // Draw code element
                    this.ctx.save();
                    this.ctx.translate(element.x, element.y);
                    this.ctx.rotate(element.rotation * Math.PI / 180);
                    
                    // Set styles
                    this.ctx.fillStyle = element.color;
                    this.ctx.globalAlpha = element.opacity;
                    this.ctx.font = `${element.size}px 'JetBrains Mono', monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    
                    // Add glow effect
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowColor = element.color;
                    
                    // Draw the symbol
                    this.ctx.fillText(element.symbol, 0, 0);
                    
                    this.ctx.restore();
                });
                
                requestAnimationFrame(() => this.animate());
            }
        }
        
        // Cursor Trail Effect
        let cursorTrail = [];
        document.addEventListener('mousemove', (e) => {
            cursorTrail.push({ x: e.clientX, y: e.clientY, life: 20 });
            
            if (cursorTrail.length > 10) {
                cursorTrail.shift();
            }
            
            const trail = document.getElementById('cursor-trail');
            if (cursorTrail.length > 0) {
                const latest = cursorTrail[cursorTrail.length - 1];
                trail.style.left = latest.x - 10 + 'px';
                trail.style.top = latest.y - 10 + 'px';
            }
        });
        
        // Terminal Commands
       const terminalCommands = {
    help: 'Available commands: about, skills, projects, contact, clear, whoami',
    about: 'Louay Hassoun - Full-Stack Developer specializing in modern web and mobile applications.',
    skills: 'React, Node.js, Flutter, JavaScript, HTML/CSS, Python/Django,PHP, Firebase, REST APIs',
    projects: 'Recent projects: BiTari2ak Delivery App, Professional POS System, Digital Restaurant Menu',
    contact: 'Email: louayhassoun91@gmail.com | Phone: +961 76 447 238',
    whoami: 'louay',
    clear: 'CLEAR'
};

function openTerminal() {
    document.getElementById('terminal').style.display = 'block';
    createNewInputLine();
}

function closeTerminal() {
    document.getElementById('terminal').style.display = 'none';
}

function createNewInputLine() {
    const body = document.getElementById('terminal-body');
    const inputLine = document.createElement('div');
    inputLine.classList.add('mt-2');
    inputLine.innerHTML = `<span class="text-accent-blue">CodeByLouay:~$</span> 
                           <input type="text" id="terminal-input" class="bg-transparent border-none outline-none text-accent-cyan ml-2" placeholder="Enter command...">
                           <span class="terminal-cursor">|</span>`;
    body.appendChild(inputLine);
    body.scrollTop = body.scrollHeight;

    const input = inputLine.querySelector('#terminal-input');
    input.focus();

    input.addEventListener('keypress', function handler(e) {
        if (e.key === 'Enter') {
            const command = input.value.toLowerCase().trim();

            // Freeze current input
            input.disabled = true;
            input.removeEventListener('keypress', handler);

            // Show command output
            if (terminalCommands[command]) {
                if (command === 'clear') {
                    body.innerHTML = `<div>Welcome to CodeByLouay Terminal v2.0</div>
                                      <div>Type 'help' for available commands</div>`;
                } else {
                    const output = document.createElement('div');
                    output.classList.add('text-accent-cyan', 'mb-2');
                    output.textContent = terminalCommands[command];
                    body.appendChild(output);
                }
            } else if (command) {
                const output = document.createElement('div');
                output.classList.add('text-red-400', 'mb-2');
                output.textContent = `Command not found: ${command}`;
                body.appendChild(output);
            }

            createNewInputLine(); // create new input line
        }
    });
}

        // Typing Animation
        const texts = ['Full-Stack Developer', 'Web Developer', 'Mobile Developer', 'Problem Solver', 'Code Architect'];
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        
        function typeText() {
            const element = document.getElementById('typing-text');
            const currentText = texts[textIndex];
            
            if (isDeleting) {
                element.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
            } else {
                element.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
            }
            
            if (!isDeleting && charIndex === currentText.length) {
                setTimeout(() => isDeleting = true, 2000);
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
            }
            
            setTimeout(typeText, isDeleting ? 50 : 100);
        }
        
        // Code Block Animation
        function animateCode() {
            const codeContent = document.getElementById('code-content');
            codeContent.style.transform = 'scale(1.05)';
            codeContent.style.filter = 'brightness(1.2)';
            
            setTimeout(() => {
                codeContent.style.transform = 'scale(1)';
                codeContent.style.filter = 'brightness(1)';
            }, 200);
        }
        
        // Smooth scrolling
        function scrollToSection(sectionId) {
            document.getElementById(sectionId).scrollIntoView({
                behavior: 'smooth'
            });
        }

        // Mobile Menu Functions
        function toggleMobileMenu() {
            const mobileMenu = document.getElementById('mobile-menu');
            const menuIcon = document.getElementById('menu-icon');
            const closeIcon = document.getElementById('close-icon');
            const isOpen = !mobileMenu.classList.contains('-translate-y-full');
            
            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        }
        
        function openMobileMenu() {
            const mobileMenu = document.getElementById('mobile-menu');
            const menuIcon = document.getElementById('menu-icon');
            const closeIcon = document.getElementById('close-icon');
            
            mobileMenu.classList.remove('-translate-y-full', 'opacity-0', 'invisible');
            mobileMenu.classList.add('translate-y-0', 'opacity-100', 'visible');
            menuIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
        }
        
        function closeMobileMenu() {
            const mobileMenu = document.getElementById('mobile-menu');
            const menuIcon = document.getElementById('menu-icon');
            const closeIcon = document.getElementById('close-icon');
            
            mobileMenu.classList.add('-translate-y-full', 'opacity-0', 'invisible');
            mobileMenu.classList.remove('translate-y-0', 'opacity-100', 'visible');
            menuIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
        }
        
        // Mobile menu toggle
        document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileMenu);
        
        // Close mobile menu when clicking on nav links
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                closeMobileMenu();
                setTimeout(() => {
                    scrollToSection(targetId);
                }, 300);
            });
        });

        // Form submission
        document.getElementById('contact-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = this.querySelector('input[type="text"]').value;
            const email = this.querySelector('input[type="email"]').value;
            const projectType = this.querySelector('select').value;
            
            // Animate button
            const button = this.querySelector('button[type="submit"]');
            button.innerHTML = 'Sending... 🚀';
            button.style.background = 'linear-gradient(45deg, #06b6d4, #3b82f6)';
            
            setTimeout(() => {
                alert(`Thank you ${name}! Your message has been received. I'll get back to you soon about your ${projectType.toLowerCase()} project.`);
                button.innerHTML = 'Send Message 🚀';
                button.style.background = 'linear-gradient(to right, #3b82f6, #06b6d4)';
                this.reset();
            }, 1500);
        });

        // Scroll Reveal Animation
        function revealOnScroll() {
            const reveals = document.querySelectorAll('.section-fade');
            
            reveals.forEach(element => {
                const windowHeight = window.innerHeight;
                const elementTop = element.getBoundingClientRect().top;
                const elementVisible = 150;
                
                if (elementTop < windowHeight - elementVisible) {
                    element.classList.add('visible');
                }
            });
        }
        
        // Timeline Animation
        function animateTimeline() {
            const timelineItems = document.querySelectorAll('.timeline-item');
            
            timelineItems.forEach(item => {
                const rect = item.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    item.classList.add('visible');
                }
            });
        }
        
        // Skill Bar Animation
        function animateSkillBars() {
            const skillItems = document.querySelectorAll('.skill-item');
            
            skillItems.forEach(item => {
                const rect = item.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    item.classList.add('animate');
                }
            });
        }
        
        // Counter Animation
        function animateCounters() {
    const counters = document.querySelectorAll('.counter');

    counters.forEach(counter => {
        const rect = counter.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0 && !counter.classList.contains('animated')) {
            counter.classList.add('animated');
            const target = parseInt(counter.getAttribute('data-target'));
            const increment = target / 50;
            let current = 0;

            const updateCounter = () => {
                if (current < target) {
                    current += increment;
                    if (counter.classList.contains('client-satisfaction')) {
                        counter.textContent = Math.ceil(current) + '%';
                    } else {
                        counter.textContent = Math.ceil(current);
                    }
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = counter.classList.contains('client-satisfaction') ? target + '%' : target;
                }
            };

            updateCounter();
        }
    });
}

        


        // Add scroll effect to navigation
        window.addEventListener('scroll', function() {
            const nav = document.querySelector('nav');
            if (window.scrollY > 100) {
                nav.classList.add('bg-code-blue');
            } else {
                nav.classList.remove('bg-code-blue');
            }
            
            revealOnScroll();
            animateTimeline();
            animateSkillBars();
            animateCounters();
        });

        // Funny Eye Watcher System
        class EyeWatcher {
            constructor() {
                this.eyeWatcher = document.getElementById('eye-watcher');
                this.pupil = document.getElementById('pupil');
                this.eyelid = document.getElementById('eyelid');
                this.message = document.getElementById('eye-message');
                this.messageIndex = -1; // Start at -1 so first increment makes it 0
                this.isBlinking = false;
                this.isVisible = false;
                
                this.messages = [
                    "I see you 👀",
                    "Now I have all your data 😈",
                    "No just kidding! 😄"
                ];
                
                // Different corner positions for each message (responsive)
                this.positions = [
                    { top: '64px', right: '8px', left: 'auto', bottom: 'auto' }, // Top-right (mobile: top-16, right-2)
                    { top: 'auto', right: 'auto', left: '8px', bottom: '20px' }, // Bottom-left (mobile: left-2)
                    { top: '64px', right: 'auto', left: '8px', bottom: 'auto' }  // Top-left (mobile: top-16, left-2)
                ];
                
                // Desktop positions (will be applied via media query check)
                this.desktopPositions = [
                    { top: '80px', right: '24px', left: 'auto', bottom: 'auto' }, // Top-right (desktop: top-20, right-6)
                    { top: 'auto', right: 'auto', left: '24px', bottom: '20px' }, // Bottom-left (desktop: left-6)
                    { top: '80px', right: 'auto', left: '24px', bottom: 'auto' }  // Top-left (desktop: top-20, left-6)
                ];
                
                this.init();
            }
            
            init() {
                // Show eye after 2 seconds
                setTimeout(() => {
                    this.showNextMessage();
                }, 2000);
                
                // Track mouse movement for pupil
                document.addEventListener('mousemove', (e) => {
                    this.trackMouse(e);
                });
                
                // Random blinking
                setInterval(() => {
                    if (!this.isBlinking && this.isVisible && Math.random() < 0.3) {
                        this.blink();
                    }
                }, 2000);
            }
            
            showNextMessage() {
                this.messageIndex++;
                
                // If we've shown all messages, hide and schedule next appearance
                if (this.messageIndex >= this.messages.length) {
                    this.hideEye();
                    return;
                }
                
                // Set position for current message (responsive)
                const isDesktop = window.innerWidth >= 640; // sm breakpoint
                const positions = isDesktop ? this.desktopPositions : this.positions;
                const position = positions[this.messageIndex];
                
                this.eyeWatcher.style.top = position.top;
                this.eyeWatcher.style.right = position.right;
                this.eyeWatcher.style.left = position.left;
                this.eyeWatcher.style.bottom = position.bottom;
                
                // Set the message
                this.message.textContent = this.messages[this.messageIndex];
                
                // Show the eye
                this.isVisible = true;
                this.eyeWatcher.style.transform = 'translateX(0) scale(1)';
                this.eyeWatcher.style.opacity = '1';
                
                // Hide after 4 seconds and show next message
                setTimeout(() => {
                    this.hideCurrentMessage();
                }, 4000);
            }
            
            hideCurrentMessage() {
                this.isVisible = false;
                this.eyeWatcher.style.transform = 'scale(0.8)';
                this.eyeWatcher.style.opacity = '0';
                
                // Wait 1 second then show next message
                setTimeout(() => {
                    this.showNextMessage();
                }, 1000);
            }
            
            hideEye() {
                this.isVisible = false;
                this.eyeWatcher.style.transform = 'scale(0.8)';
                this.eyeWatcher.style.opacity = '0';
                
                // Schedule next appearance (30-60 seconds later)
                const nextAppearance = Math.random() * 30000 + 30000; // 30-60 seconds
                setTimeout(() => {
                    this.messageIndex = -1; // Reset message index
                    this.showNextMessage();
                }, nextAppearance);
            }
            
            trackMouse(e) {
                if (this.isBlinking || !this.isVisible) return;
                
                const eyeRect = this.pupil.parentElement.getBoundingClientRect();
                const eyeCenterX = eyeRect.left + eyeRect.width / 2;
                const eyeCenterY = eyeRect.top + eyeRect.height / 2;
                
                const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
                const distance = Math.min(8, Math.sqrt(Math.pow(e.clientX - eyeCenterX, 2) + Math.pow(e.clientY - eyeCenterY, 2)) / 10);
                
                const pupilX = Math.cos(angle) * distance;
                const pupilY = Math.sin(angle) * distance;
                
                this.pupil.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
            }
            
            blink() {
                this.isBlinking = true;
                this.eyelid.style.height = '100%';
                
                setTimeout(() => {
                    this.eyelid.style.height = '0%';
                    this.isBlinking = false;
                }, 150);
            }
        }
        
        function closeEyeWatcher() {
            const eyeWatcher = document.getElementById('eye-watcher');
            eyeWatcher.style.transform = 'translateX(100%) scale(0.8)';
            eyeWatcher.style.opacity = '0';
            
            setTimeout(() => {
                eyeWatcher.style.display = 'none';
            }, 500);
        }

        // Project Demo Functions
        function openProjectDemo(projectType) {
            const modal = document.getElementById('project-modal');
            const title = document.getElementById('modal-title');
            const body = document.getElementById('modal-body');
            
            const projects = {
                bitari2ak: {
                    title: '🚚 BiTari2ak - Delivery App Platform',
                    content: `
                        <div class="mb-6">
                            <p class="text-lg mb-4">Complete delivery ecosystem with mobile app and web dashboard:</p>
                            <div class="grid md:grid-cols-2 gap-6 mb-6">
                                <div class="space-y-3">
                                    <h4 class="text-accent-cyan font-semibold">✨ Key Features:</h4>
                                    <ul class="space-y-2 text-sm">
                                        <li>• Flutter Mobile App (iOS & Android)</li>
                                        <li>• React Admin Dashboard</li>
                                        <li>• Real-time Order Tracking</li>
                                        <li>• Customer-Delivery Messaging</li>
                                        <li>• AI Chatbot Integration</li>
                                        <li>• User Authentication & Profiles</li>
                                        <li>• Add to Cart & Checkout</li>
                                        <li>• Advanced Search & Filters</li>
                                        <li>• Order Management System</li>
                                    </ul>
                                </div>
                                <div class="space-y-3">
                                    <h4 class="text-accent-cyan font-semibold">🛠️ Technologies:</h4>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">Flutter</span>
                                        <span class="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm rounded-full">Firebase</span>
                                        <span class="px-3 py-1 bg-accent-blue/20 text-accent-blue text-sm rounded-full">React</span>
                                        <span class="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">Node.js</span>
                                    </div>
                                    <h4 class="text-accent-cyan font-semibold mt-4">🎯 Project Highlights:</h4>
                                    <ul class="space-y-1 text-sm text-gray-300">
                                        <li>• Cross-platform mobile solution</li>
                                        <li>• Real-time communication system</li>
                                        <li>• Scalable cloud infrastructure</li>
                                        <li>• Modern, intuitive UI/UX</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4 rounded-lg text-center border border-orange-500/20">
                            <p class="text-orange-400 mb-3">🚀 Full-Scale Delivery Platform</p>
                            <p class="text-sm text-gray-400 mb-4">A complete delivery solution that connects customers, restaurants, and delivery personnel seamlessly.</p>
                            <button onclick="scrollToSection('contact'); closeModal();" class="bg-orange-500 hover:bg-orange-500/80 px-6 py-2 rounded-lg font-semibold transition-all duration-300">
                                Build Your Delivery App
                            </button>
                        </div>
                    `
                },
                pos: {
                    title: '🏪 Professional POS System',
                    content: `
                        <div class="mb-6">
                            <p class="text-lg mb-4">Enterprise-grade Point of Sale desktop application:</p>
                            <div class="grid md:grid-cols-2 gap-6 mb-6">
                                <div class="space-y-3">
                                    <h4 class="text-accent-cyan font-semibold">✨ Key Features:</h4>
                                    <ul class="space-y-2 text-sm">
                                        <li>• Secure User Authentication</li>
                                        <li>• Comprehensive Admin Dashboard</li>
                                        <li>• Advanced Order Management</li>
                                        <li>• Product Category Organization</li>
                                        <li>• Real-time Inventory Tracking</li>
                                        <li>• Sales Analytics & Reports</li>
                                        <li>• Customer Management</li>
                                        <li>• Receipt Generation & Printing</li>
                                        <li>• Modern, Intuitive Interface</li>
                                    </ul>
                                </div>
                                <div class="space-y-3">
                                    <h4 class="text-accent-cyan font-semibold">🛠️ Technologies:</h4>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">C#</span>
                                        <span class="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-full">MySQL</span>
                                        <span class="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm rounded-full">WinForms</span>
                                        <span class="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">.NET Framework</span>
                                    </div>
                                    <h4 class="text-accent-cyan font-semibold mt-4">🎯 Business Benefits:</h4>
                                    <ul class="space-y-1 text-sm text-gray-300">
                                        <li>• Streamlined checkout process</li>
                                        <li>• Accurate inventory management</li>
                                        <li>• Detailed sales reporting</li>
                                        <li>• User-friendly interface</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gradient-to-r from-purple-500/10 to-blue-600/10 p-4 rounded-lg text-center border border-purple-500/20">
                            <p class="text-purple-400 mb-3">💼 Enterprise Desktop Solution</p>
                            <p class="text-sm text-gray-400 mb-4">Professional POS system designed for retail businesses with robust features and reliable performance.</p>
                            <button onclick="scrollToSection('contact'); closeModal();" class="bg-purple-500 hover:bg-purple-500/80 px-6 py-2 rounded-lg font-semibold transition-all duration-300">
                                Get Your POS System
                            </button>
                        </div>
                    `
                },
                menu: {
                    title: '🍽️ Digital Restaurant Menu System',
                    content: `
                        <div class="mb-6">
                            <p class="text-lg mb-4">Interactive digital menu solution for modern restaurants:</p>
                            <div class="grid md:grid-cols-2 gap-6 mb-6">
                                <div class="space-y-3">
                                    <h4 class="text-accent-cyan font-semibold">✨ Key Features:</h4>
                                    <ul class="space-y-2 text-sm">
                                        <li>• Interactive Digital Menu Display</li>
                                        <li>• Admin Dashboard for Management</li>
                                        <li>• Advanced Search Functionality</li>
                                        <li>• Category-based Organization</li>
                                        <li>• Real-time Menu Updates</li>
                                        <li>• Responsive Design (All Devices)</li>
                                        <li>• Image Gallery for Dishes</li>
                                        <li>• Price & Availability Management</li>
                                        <li>• Customer-friendly Interface</li>
                                    </ul>
                                </div>
                                <div class="space-y-3">
                                    <h4 class="text-accent-cyan font-semibold">🛠️ Technologies:</h4>
                                    <div class="flex flex-wrap gap-2">
                                        <span class="px-3 py-1 bg-orange-500/20 text-orange-400 text-sm rounded-full">HTML5</span>
                                        <span class="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">CSS3</span>
                                        <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">JavaScript</span>
                                        <span class="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">Local Storage</span>
                                    </div>
                                    <h4 class="text-accent-cyan font-semibold mt-4">🎯 Restaurant Benefits:</h4>
                                    <ul class="space-y-1 text-sm text-gray-300">
                                        <li>• Reduce printing costs</li>
                                        <li>• Easy menu updates</li>
                                        <li>• Enhanced customer experience</li>
                                        <li>• Modern, professional look</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gradient-to-r from-green-500/10 to-teal-500/10 p-4 rounded-lg text-center border border-green-500/20">
                            <p class="text-green-400 mb-3">🌟 Modern Restaurant Solution</p>
                            <p class="text-sm text-gray-400 mb-4">Transform your restaurant's menu experience with this interactive digital solution.</p>
                            <button onclick="scrollToSection('contact'); closeModal();" class="bg-green-500 hover:bg-green-500/80 px-6 py-2 rounded-lg font-semibold transition-all duration-300">
                                Get Your Digital Menu
                            </button>
                        </div>
                    `
                }
            };
            
            const project = projects[projectType];
            title.textContent = project.title;
            body.innerHTML = project.content;
            modal.classList.add('active');
        }
        
        function closeModal() {
            document.getElementById('project-modal').classList.remove('active');
        }
        
        // Service Modal Functions
        function openServiceModal(serviceType) {
            const modal = document.getElementById('service-modal');
            const title = document.getElementById('service-modal-title');
            const body = document.getElementById('service-modal-body');
            
            const services = {
                web: {
                    title: '🌐 Web Development Services',
                    content: `
                        <div class="space-y-6">
                            <div class="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 class="text-xl font-semibold text-accent-cyan mb-4">What I Offer:</h4>
                                    <ul class="space-y-3 text-sm">
                                        <li class="flex items-start">
                                            <span class="text-accent-blue mr-2">🎨</span>
                                            <div>
                                                <strong>Custom Web Applications</strong><br>
                                                <span class="text-gray-400">Tailored solutions built with React, or Javascript</span>
                                            </div>
                                        </li>
                                        <li class="flex items-start">
                                            <span class="text-accent-blue mr-2">⚡</span>
                                            <div>
                                                <strong>Performance Optimization</strong><br>
                                                <span class="text-gray-400">Lightning-fast loading times and smooth user experience</span>
                                            </div>
                                        </li>
                                        <li class="flex items-start">
                                            <span class="text-accent-blue mr-2">📱</span>
                                            <div>
                                                <strong>Responsive Design</strong><br>
                                                <span class="text-gray-400">Perfect experience across all devices and screen sizes</span>
                                            </div>
                                        </li>
                                        <li class="flex items-start">
                                            <span class="text-accent-blue mr-2">🔧</span>
                                            <div>
                                                <strong>API Integration</strong><br>
                                                <span class="text-gray-400">Seamless connection with third-party services and databases</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 class="text-xl font-semibold text-accent-cyan mb-4">Technologies I Use:</h4>
                                    <div class="space-y-4">
                                        <div>
                                            <h5 class="font-medium mb-2">Frontend:</h5>
                                            <div class="flex flex-wrap gap-2">
                                                <span class="px-2 py-1 bg-accent-blue/20 text-accent-blue text-xs rounded">React</span>
                                                <span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">JavaScript</span>
                                                <span class="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">HTML</span>
                                                <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">CSS</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 class="font-medium mb-2">Backend:</h5>
                                            <div class="flex flex-wrap gap-2">
                                                <span class="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">Node.js</span>
                                                <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">PHP</span>
                                                <span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Python</span>
                                                <span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Django</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 class="font-medium mb-2">Database & Services:</h5>
                                            <div class="flex flex-wrap gap-2">
                                                <span class="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">Firebase</span>
                                                <span class="px-2 py-1 bg-green-700/20 text-green-400 text-xs rounded">MongoDB</span>
                                                <span class="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">REST APIs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gradient-to-r from-accent-blue/10 to-accent-cyan/10 p-6 rounded-lg border border-accent-blue/20">
                                <h4 class="text-lg font-semibold mb-3 text-accent-cyan">💰 Pricing & Timeline</h4>
                                <div class="grid md:grid-cols-3 gap-4 text-sm">
                                    <div class="text-center">
                                        <div class="font-semibold text-accent-blue">Basic Website</div>
                                        <div class="text-2xl font-bold my-2">$100+</div>
                                        <div class="text-gray-400">5-7 pages, responsive design, 1 weeks</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-semibold text-accent-cyan">Web Application</div>
                                        <div class="text-2xl font-bold my-2">$300+</div>
                                        <div class="text-gray-400">Custom features, database, 4-6 weeks</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-semibold text-purple-400">Enterprise Solution</div>
                                        <div class="text-2xl font-bold my-2">$800+</div>
                                        <div class="text-gray-400">Complex systems, 8-12 weeks</div>
                                    </div>
                                </div>
                            </div>
                            <div class="text-center">
                                <button onclick="scrollToSection('contact'); closeServiceModal();" class="bg-accent-blue hover:bg-accent-blue/80 px-8 py-3 rounded-lg font-semibold transition-all duration-300 mr-4">
                                    Start Your Project
                                </button>
                                <button onclick="closeServiceModal();" class="glass-effect hover:bg-white/10 px-6 py-3 rounded-lg font-semibold transition-all duration-300">
                                    Close
                                </button>
                            </div>
                        </div>
                    `
                },
                mobile: {
                    title: '📱 Mobile Development Services',
                    content: `
                        <div class="space-y-6">
                            <div class="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 class="text-xl font-semibold text-accent-cyan mb-4">What I Offer:</h4>
                                    <ul class="space-y-3 text-sm">
                                        <li class="flex items-start">
                                            <span class="text-accent-cyan mr-2">📱</span>
                                            <div>
                                                <strong>Cross-Platform Apps</strong><br>
                                                <span class="text-gray-400">One codebase for both iOS and Android using Flutter</span>
                                            </div>
                                        </li>
                                        <li class="flex items-start">
                                            <span class="text-accent-cyan mr-2">🎨</span>
                                            <div>
                                                <strong>Native UI/UX Design</strong><br>
                                                <span class="text-gray-400">Platform-specific design that feels natural to users</span>
                                            </div>
                                        </li>
                                        <li class="flex items-start">
                                            <span class="text-accent-cyan mr-2">🔄</span>
                                            <div>
                                                <strong>Real-time Features</strong><br>
                                                <span class="text-gray-400">Push notifications, live updates, and offline support</span>
                                            </div>
                                        </li>
                                        <li class="flex items-start">
                                            <span class="text-accent-cyan mr-2">🚀</span>
                                            <div>
                                                <strong>App Store Deployment</strong><br>
                                                <span class="text-gray-400">Complete deployment to Apple App Store and Google Play</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 class="text-xl font-semibold text-accent-cyan mb-4">Technologies I Use:</h4>
                                    <div class="space-y-4">
                                        <div>
                                            <h5 class="font-medium mb-2">Mobile Development:</h5>
                                            <div class="flex flex-wrap gap-2">
                                                <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Flutter</span>
                                                <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">Dart</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 class="font-medium mb-2">Backend & Services:</h5>
                                            <div class="flex flex-wrap gap-2">
                                                <span class="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">Firebase</span>
                                                <span class="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded">Node.js API</span>
                                                <span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Python API</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 class="font-medium mb-2">Database:</h5>
                                            <div class="flex flex-wrap gap-2">
                                                <span class="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">Firestore</span>
                                                <span class="px-2 py-1 bg-green-700/20 text-green-400 text-xs rounded">MongoDB</span>
                                                <span class="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">REST APIs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gradient-to-r from-accent-cyan/10 to-purple-500/10 p-6 rounded-lg border border-accent-cyan/20">
                                <h4 class="text-lg font-semibold mb-3 text-accent-cyan">💰 Pricing & Timeline</h4>
                                <div class="grid md:grid-cols-3 gap-4 text-sm">
                                    <div class="text-center">
                                        <div class="font-semibold text-accent-cyan">Simple App</div>
                                        <div class="text-2xl font-bold my-2">$600+</div>
                                        <div class="text-gray-400">Basic features, 3-4 weeks</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-semibold text-purple-400">Feature-Rich App</div>
                                        <div class="text-2xl font-bold my-2">$1,200+</div>
                                        <div class="text-gray-400">Advanced features, 6-8 weeks</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-semibold text-orange-400">Enterprise App</div>
                                        <div class="text-2xl font-bold my-2">$2,500+</div>
                                        <div class="text-gray-400">Complex systems, 10-16 weeks</div>
                                    </div>
                                </div>
                            </div>
                            <div class="text-center">
                                <button onclick="scrollToSection('contact'); closeServiceModal();" class="bg-accent-cyan hover:bg-accent-cyan/80 px-8 py-3 rounded-lg font-semibold transition-all duration-300 mr-4">
                                    Start Your App
                                </button>
                                <button onclick="closeServiceModal();" class="glass-effect hover:bg-white/10 px-6 py-3 rounded-lg font-semibold transition-all duration-300">
                                    Close
                                </button>
                            </div>
                        </div>
                    `
                }
            };
            
            const service = services[serviceType];
            title.textContent = service.title;
            body.innerHTML = service.content;
            modal.classList.add('active');
        }
        
        function closeServiceModal() {
            document.getElementById('service-modal').classList.remove('active');
        }

        // Initialize everything
        document.addEventListener('DOMContentLoaded', function() {
            new FloatingCodeSystem();
            new EyeWatcher();
            typeText();
            revealOnScroll();
            
            // Close modals with Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeTerminal();
                    closeModal();
                    closeServiceModal();
                }
            });
            
            // Close modals when clicking outside
            document.getElementById('project-modal').addEventListener('click', function(e) {
                if (e.target === this) closeModal();
            });
            
            document.getElementById('service-modal').addEventListener('click', function(e) {
                if (e.target === this) closeServiceModal();
            });
        });
   
(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9793b922073b4b31',t:'MTc1Njg4NjUyOC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();