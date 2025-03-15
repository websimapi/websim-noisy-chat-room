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
    this.username = username || 'Anonymous'; 
    this.isOwn = isOwn;
    this.characterSpans = [];
    this.usernameSpans = [];
    this.element = this.createMessageElement();
    this.noiseRegions = [];
    this.animationFrame = 0;
    this.maxFrames = 60;
    this.active = true;
    this.moveSpeed = 0.5;
    this.moveRange = 5;
    this.moveOffset = { x: 0, y: 0 };
    this.lastUpdateTime = Date.now();
    this.pixelCache = {}; // Cache for letter pixels
    this.lastPositions = {}; // Track last positions to avoid redrawing
  }

  createMessageElement() {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${this.isOwn ? 'own' : ''}`;
    messageDiv.style.position = 'relative';
    
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'username';
    
    // Convert username to spans for character-level noise
    for (let i = 0; i < this.username.length; i++) {
      const span = document.createElement('span');
      span.textContent = this.username[i];
      span.style.color = 'transparent';
      span.style.position = 'relative';
      span.style.display = 'inline-block';
      this.usernameSpans.push(span);
      usernameDiv.appendChild(span);
    }
    
    const textDiv = document.createElement('div');
    
    // Convert message text to spans for character-level noise
    for (let i = 0; i < this.text.length; i++) {
      const span = document.createElement('span');
      span.textContent = this.text[i];
      span.style.color = 'transparent';
      span.style.position = 'relative';
      span.style.display = 'inline-block';
      this.characterSpans.push(span);
      textDiv.appendChild(span);
    }
    
    messageDiv.appendChild(usernameDiv);
    messageDiv.appendChild(textDiv);
    
    return messageDiv;
  }

  getLetterPixels(span) {
    const rect = span.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    
    // Create a hidden canvas to render the letter
    const letterCanvas = document.createElement('canvas');
    letterCanvas.width = Math.ceil(rect.width);
    letterCanvas.height = Math.ceil(rect.height);
    const letterCtx = letterCanvas.getContext('2d');
    
    // Clear and set transparent background
    letterCtx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw text
    letterCtx.fillStyle = 'white';
    letterCtx.font = window.getComputedStyle(span).font;
    letterCtx.textBaseline = 'top';
    letterCtx.fillText(span.textContent, 0, 0);
    
    // Get image data
    const letterData = letterCtx.getImageData(0, 0, rect.width, rect.height);
    const data = letterData.data;
    
    // Find the actual pixels that make up the letter (white pixels)
    const letterPixels = [];
    for (let y = 0; y < rect.height; y++) {
      for (let x = 0; x < rect.width; x++) {
        const idx = (y * rect.width + x) * 4;
        // If pixel has significant alpha (part of the letter)
        if (data[idx + 3] > 50) {
          letterPixels.push({
            x: Math.floor(rect.x + x),
            y: Math.floor(rect.y + y)
          });
        }
      }
    }
    
    return letterPixels;
  }

  update() {
    if (!this.active) return false;
    
    // Update position with subtle movement
    this.moveOffset.x = Math.sin(Date.now() * 0.001) * this.moveRange;
    this.moveOffset.y = Math.cos(Date.now() * 0.0015) * this.moveRange;
    
    this.element.style.transform = `translate(${this.moveOffset.x}px, ${this.moveOffset.y}px)`;
    
    // Apply noise to each username character
    this.usernameSpans.forEach(span => {
      this.processCharacterSpan(span);
    });
    
    // Apply noise to each message character
    this.characterSpans.forEach(span => {
      this.processCharacterSpan(span);
    });
    
    // Always keep messages active to continuously update noise
    return true;
  }
  
  processCharacterSpan(span) {
    const rect = span.getBoundingClientRect();
    const key = span.textContent + rect.x + rect.y + rect.width + rect.height;
    
    // Skip processing if position hasn't changed and we already have cached pixels
    const positionKey = `${rect.x},${rect.y}`;
    const hasPositionChanged = this.lastPositions[key] !== positionKey;
    this.lastPositions[key] = positionKey;
    
    let letterPixels;
    
    // Check if we have these letter pixels cached
    if (this.pixelCache[key] && !hasPositionChanged) {
      letterPixels = this.pixelCache[key];
    } else {
      letterPixels = this.getLetterPixels(span);
      if (letterPixels) {
        this.pixelCache[key] = letterPixels;
      }
    }
    
    if (!letterPixels || letterPixels.length === 0) return;
    
    // Apply noise to each pixel of the letter
    letterPixels.forEach(pixel => {
      if (pixel.x < 0 || pixel.y < 0 || pixel.x >= canvas.width || pixel.y >= canvas.height) return;
      
      const imageData = ctx.getImageData(pixel.x, pixel.y, 1, 1);
      const data = imageData.data;
      
      const noisyPixel = getRandomPixel();
      data[0] = noisyPixel[0];
      data[1] = noisyPixel[1];
      data[2] = noisyPixel[2];
      data[3] = noisyPixel[3];
      
      ctx.putImageData(imageData, pixel.x, pixel.y);
    });
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

// Animation loop with time-based updates
function animate() {
  // Don't filter out animations, keep them all active
  activeAnimations.forEach(animation => animation.update());
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