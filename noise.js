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
    this.originalPosition = { x: 0, y: 0 };
    this.moveSpeed = 0.5;
    this.moveRange = 5;
    this.moveOffset = { x: 0, y: 0 };
  }

  createMessageElement() {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${this.isOwn ? 'own' : ''}`;
    messageDiv.style.position = 'relative';
    
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'username';
    usernameDiv.textContent = this.username;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'text-content';
    textDiv.textContent = this.text;
    
    messageDiv.appendChild(usernameDiv);
    messageDiv.appendChild(textDiv);
    
    // Apply noise effect only to the text content
    const textNode = messageDiv.querySelector('.text-content');
    textNode.style.color = 'transparent';
    textNode.style.textShadow = 'none';
    
    return messageDiv;
  }

  update() {
    if (!this.active) return false;
    
    // Update position with subtle movement
    this.moveOffset.x = Math.sin(Date.now() * 0.001) * this.moveRange;
    this.moveOffset.y = Math.cos(Date.now() * 0.001) * this.moveRange;
    
    this.element.style.transform = `translate(${this.moveOffset.x}px, ${this.moveOffset.y}px)`;
    
    // Get the text content element's position
    const textElement = this.element.querySelector('.text-content');
    const rect = textElement.getBoundingClientRect();
    
    // Update noise region based on only the text content
    this.noiseRegion = {
      x: Math.floor(rect.x),
      y: Math.floor(rect.y),
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height)
    };
    
    // Generate noise for the entire message region
    const imageData = ctx.getImageData(
      this.noiseRegion.x,
      this.noiseRegion.y,
      this.noiseRegion.width,
      this.noiseRegion.height
    );
    
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const pixel = getRandomPixel();
      data[i] = pixel[0];     // R
      data[i + 1] = pixel[1]; // G
      data[i + 2] = pixel[2]; // B
      data[i + 3] = pixel[3]; // A
    }
    
    ctx.putImageData(imageData, this.noiseRegion.x, this.noiseRegion.y);
    
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
    animation.calculateNoiseRegion = function() {
      const rect = this.element.getBoundingClientRect();
      this.originalPosition = { x: rect.x, y: rect.y };
      this.noiseRegion = {
        x: Math.floor(rect.x),
        y: Math.floor(rect.y),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
      };
    };
    animation.calculateNoiseRegion();
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