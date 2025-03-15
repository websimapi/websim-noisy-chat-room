let canvas = document.getElementById('noiseCanvas');
let ctx = canvas.getContext('2d');
let toggleMenuButton = document.getElementById('toggleMenu');
let controlsPanel = document.querySelector('.controls');
let sensitivity = 10;
let previousImageData = null;

// Message animation system
class MessageAnimation {
  constructor(text, username, isOwn = false) {
    this.text = text;
    this.username = username;
    this.isOwn = isOwn;
    this.element = this.createMessageElement();
    this.noiseRegion = null;
    this.animationFrame = 0;
    this.maxFrames = 60;
    this.active = true;
    this.jitterAmount = 1; // Reduced jitter for better readability
    this.lastUpdate = 0;
    this.updateInterval = 50; // Update every 50ms
    this.textSpans = [];
  }

  createMessageElement() {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${this.isOwn ? 'own' : ''}`;
    
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'username';
    usernameDiv.textContent = this.username;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'text-content';
    
    this.textSpans = this.text.split('').map(char => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.position = 'relative';
      span.style.display = 'inline-block';
      return span;
    });
    
    this.textSpans.forEach(span => textDiv.appendChild(span));
    
    messageDiv.appendChild(usernameDiv);
    messageDiv.appendChild(textDiv);
    
    return messageDiv;
  }

  update() {
    if (!this.active) return false;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return true;
    }
    this.lastUpdate = now;

    // Update each character's position independently with subtle jitter
    this.textSpans.forEach(span => {
      const offsetX = (Math.random() - 0.5) * this.jitterAmount;
      const offsetY = (Math.random() - 0.5) * this.jitterAmount;
      span.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

      // Get the position after the transform is applied
      const rect = span.getBoundingClientRect();
      
      // Skip if the span hasn't been properly rendered yet
      if (rect.width === 0 || rect.height === 0) return;
      
      // Add padding around the character to ensure we capture the full letter
      const padding = 2;
      const noiseRegion = {
        x: Math.max(0, Math.floor(rect.x - padding)),
        y: Math.max(0, Math.floor(rect.y - padding)),
        width: Math.min(canvas.width - Math.floor(rect.x - padding), Math.ceil(rect.width + padding * 2)),
        height: Math.min(canvas.height - Math.floor(rect.y - padding), Math.ceil(rect.height + padding * 2))
      };

      // Verify the region is valid before proceeding
      if (noiseRegion.width > 0 && noiseRegion.height > 0) {
        try {
          // Apply noise effect to the character region
          const imageData = ctx.getImageData(
            noiseRegion.x,
            noiseRegion.y,
            noiseRegion.width,
            noiseRegion.height
          );

          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const pixel = getRandomPixel();
            data[i] = pixel[0];     // R
            data[i + 1] = pixel[1]; // G
            data[i + 2] = pixel[2]; // B
            data[i + 3] = 255;      // A
          }

          ctx.putImageData(imageData, noiseRegion.x, noiseRegion.y);
        } catch (error) {
          console.warn('Skipping invalid region:', error);
        }
      }
    });

    this.animationFrame++;
    if (this.animationFrame >= this.maxFrames) {
      this.active = false;
      return false;
    }
    
    return true;
  }
}

let activeAnimations = [];

// Chat system
let username = prompt('Enter your username:', 'User' + Math.floor(Math.random() * 1000));
const chatContainer = document.createElement('div');
chatContainer.className = 'chat-container';

const messagesContainer = document.createElement('div');
messagesContainer.className = 'chat-messages';

const inputContainer = document.createElement('div');
inputContainer.className = 'chat-input';

const input = document.createElement('input');
input.type = 'text';
input.placeholder = 'Type a message...';

const sendButton = document.createElement('button');
sendButton.textContent = 'Send';

inputContainer.appendChild(input);
inputContainer.appendChild(sendButton);
chatContainer.appendChild(messagesContainer);
chatContainer.appendChild(inputContainer);
document.body.appendChild(chatContainer);

function addMessage(text, username, isOwn = false) {
  const animation = new MessageAnimation(text, username, isOwn);
  messagesContainer.appendChild(animation.element);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // Wait for next frame to calculate position after DOM update
  requestAnimationFrame(() => {
    activeAnimations.push(animation);
  });
}

function handleMessage() {
  const text = input.value.trim();
  if (text) {
    addMessage(text, username, true);
    input.value = '';
    
    // Simulate received message after delay
    setTimeout(() => {
      addMessage('Echo: ' + text, 'Bot');
    }, 1000);
  }
}

sendButton.addEventListener('click', handleMessage);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleMessage();
});

// Set canvas size to window size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  generateNoise();
}

// Initialize canvas size
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Generate random noise for a pixel
function getRandomPixel() {
  const value = Math.random() > 0.5 ? 255 : 0;
  return [value, value, value, 255];
}

// Fill canvas with random noise
function generateNoise(region = null) {
  const imageData = ctx.getImageData(
    region ? region.x : 0,
    region ? region.y : 0,
    region ? region.width : canvas.width,
    region ? region.height : canvas.height
  );
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const pixel = getRandomPixel();
    data[i] = pixel[0];     // R
    data[i + 1] = pixel[1]; // G
    data[i + 2] = pixel[2]; // B
    data[i + 3] = pixel[3]; // A
  }
  
  ctx.putImageData(imageData, region ? region.x : 0, region ? region.y : 0);
}

// Animation loop
function animate() {
  // Clear the entire canvas with noise before updating animations
  generateNoise();
  
  // Update active animations
  activeAnimations = activeAnimations.filter(animation => animation.update());
  
  requestAnimationFrame(animate);
}

// Add toggle menu handler
toggleMenuButton.addEventListener('click', () => {
  controlsPanel.classList.toggle('hidden');
});

// Start animation loop
animate();

// Initial noise generation
generateNoise();

// Add some welcome messages
setTimeout(() => {
  addMessage('Welcome to the Noisy Chat Room!', 'System');
}, 500);

setTimeout(() => {
  addMessage('Try sending a message to see the noise effect!', 'System');
}, 1500);