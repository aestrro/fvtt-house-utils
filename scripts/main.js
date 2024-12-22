// Register your module with Foundry
Hooks.once('init', () => {
  console.log('fvtt-house-utils | Initializing FVTT House Utilities Module');

  // Register any custom settings, if needed
  registerSettings();

  // Register custom module hooks
  registerHooks();
});

// Function to register custom settings
function registerSettings() {
  // Example: A boolean setting
  game.settings.register('fvtt-house-utils', 'enableFeatureX', {
    name: 'Enable Feature X',
    hint: 'Toggle this setting to enable or disable Feature X.',
    scope: 'world', // 'world' for all users or 'client' for the current user
    config: true, // Show in the module settings menu
    type: Boolean,
    default: true
  });
}

// Function to register custom hooks
function registerHooks() {
  // Example: Hook into chat messages
  Hooks.on('renderChatMessage', (message, html, data) => {
    console.log('fvtt-house-utils | A chat message was rendered:', message);
  });

  // Example: Hook into ready event
  Hooks.once('ready', () => {
    console.log('fvtt-house-utils | FVTT House Utilities is ready!');
  });
}