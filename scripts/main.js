// Register your module with Foundry
Hooks.once('init', () => {
  console.log('fvtt-house-utils | Initializing FVTT House Utilities Module');

  // Register custom settings
  registerSettings();

  // Register custom hooks
  registerHooks();
});

// Function to register custom settings
function registerSettings() {
  // Example: A setting for Shield Spell bonus
  game.settings.register('fvtt-house-utils', 'shieldSpellBonus', {
    name: 'Shield Spell Bonus',
    hint: 'Set the AC bonus granted by the Shield Spell.',
    scope: 'world',
    config: true,
    type: Number,
    default: 5 // Default bonus value
  });
}

// Function to register custom hooks
function registerHooks() {
  // Monitor actor updates
  Hooks.on('preUpdateActor', async (actor, updateData) => {
    try {
      const shieldSpellSkill = calculateShieldSpell(actor);
      if (shieldSpellSkill) {
        await updateShieldSpellSkill(actor, shieldSpellSkill);
      }
    } catch (error) {
      console.error('fvtt-house-utils | Error updating Shield Spell skill:', error);
    }
  });

  // Log module readiness
  Hooks.once('ready', () => {
    console.log('fvtt-house-utils | FVTT House Utilities is ready!');
  });
}

// Function: Calculate the "Shield Spell" skill value
function calculateShieldSpell(actor) {
  const actorData = actor.data?.data;

  if (!actorData?.attributes?.ac) return null; // Ensure AC data exists

  const shieldSpellBonus = game.settings.get('fvtt-house-utils', 'shieldSpellBonus');
  const baseAC = actorData.attributes.ac.value || 10; // Actor's AC
  const skillValue = baseAC - 10 + shieldSpellBonus;

  return {
    key: 'shield-spell',
    label: 'Shield Spell',
    value: skillValue,
    ability: 'dex' // Placeholder; not directly used
  };
}

// Function: Update or add the "Shield Spell" skill to the actor
async function updateShieldSpellSkill(actor, skillData) {
  const existingSkill = actor.data.data.skills?.[skillData.key];

  if (!existingSkill) {
    // Add the skill if it doesn't exist
    await actor.update({
      [`data.skills.${skillData.key}`]: {
        ability: skillData.ability,
        value: skillData.value,
        label: skillData.label
      }
    });
    console.log(`fvtt-house-utils | Added '${skillData.label}' to ${actor.name}`);
  } else if (existingSkill.value !== skillData.value) {
    // Update the skill if the value has changed
    await actor.update({
      [`data.skills.${skillData.key}.value`]: skillData.value
    });
    console.log(`fvtt-house-utils | Updated '${skillData.label}' for ${actor.name} to ${skillData.value}`);
  }
}
