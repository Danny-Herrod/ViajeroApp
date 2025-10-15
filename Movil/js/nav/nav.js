 const navItems = document.querySelectorAll('.nav-item');
        
        function handleNavClick(event) {
            const clickedItem = event.currentTarget;
            
            if (clickedItem.classList.contains('active')) {
                return;
            }
            
            navItems.forEach(item => {
                item.classList.remove('active');
            });
            
            clickedItem.classList.add('active');
            
            clickedItem.classList.add('clicked');
            setTimeout(() => {
                clickedItem.classList.remove('clicked');
            }, 600);
            
            const navType = clickedItem.dataset.nav;
            console.log(`Navegando a: ${navType}`);
        }
        
        navItems.forEach(item => {
            item.addEventListener('click', handleNavClick);
        });
        
        // Accesibilidad con teclado
        navItems.forEach((item, index) => {
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', item.dataset.label);
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavClick(e);
                }
                
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const currentIndex = Array.from(navItems).indexOf(item);
                    let newIndex;
                    
                    if (e.key === 'ArrowLeft') {
                        newIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1;
                    } else {
                        newIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0;
                    }
                    
                    navItems[newIndex].focus();
                }
            });
        });