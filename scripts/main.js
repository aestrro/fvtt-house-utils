// Register your module with Foundry
Hooks.once('init', () => {
  console.log('fvtt-house-utils | Initializing FVTT House Utilities Module');
  registerSettings();
  registerHooks();
});

// Function to register custom settings
function registerSettings() {
  game.settings.register('fvtt-house-utils', 'enableCustomSkills', {
    name: 'Enable Custom Skills',
    hint: 'Toggle this to enable the Defense and Shield Spell skills.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
}

// Function to register custom hooks
function registerHooks() {
  Hooks.on('preUpdateActor', async (actor, updateData) => {
    if (!game.settings.get('fvtt-house-utils', 'enableCustomSkills')) return;

    const defenseSkill = calculateDefensiveSkill(actor);
    if (defenseSkill) {
      console.log('fvtt-house-utils | Calculated Defense Skill:', defenseSkill);
      await updateCustomSkill(actor, defenseSkill);
    }

    const shieldSpellSkill = calculateShieldSpell(actor);
    if (shieldSpellSkill) {
      console.log('fvtt-house-utils | Calculated Shield Spell Skill:', shieldSpellSkill);
      await updateCustomSkill(actor, shieldSpellSkill);
    }
  });
}

// Function to calculate the "Defense" skill
function calculateDefensiveSkill(actor) {
  const actorData = actor.data.data;

  if (!actorData.attributes || !actorData.attributes.ac) return null;

  const baseAC = actorData.attributes.ac.value || 10;
  const dexMod = actorData.abilities?.dex?.mod || 0;
  const skillValue = baseAC - 10 + dexMod;

  return {
    key: 'defense',
    label: 'Defense',
    value: skillValue,
    ability: 'dex'
  };
}

// Function to calculate the "Shield Spell" skill
function calculateShieldSpell(actor) {
  const actorData = actor.data.data;

  if (!actorData.attributes || !actorData.attributes.ac) return null;

  const shieldSpellBonus = 5; // Default Shield spell AC bonus
  const baseAC = actorData.attributes.ac.value || 10;
  const skillValue = baseAC - 10 + shieldSpellBonus;

  return {
    key: 'shield-spell',
    label: 'Shield Spell',
    value: skillValue,
    ability: 'dex'
  };
}

// Function to add or update custom skills on the actor
async function updateCustomSkill(actor, skillData) {
  const existingSkill = actor.data.data.skills?.[skillData.key];

  if (!existingSkill) {
    // Add the skill if it doesn't exist
    console.log(`fvtt-house-utils | Adding '${skillData.label}' to ${actor.name}`);
    await actor.update({
      [`data.skills.${skillData.key}`]: {
        ability: skillData.ability,
        value: skillData.value,
        label: skillData.label
      }
    });
  } else if (existingSkill.value !== skillData.value) {
    // Update the skill if the value has changed
    console.log(`fvtt-house-utils | Updating '${skillData.key}' for ${actor.name} to ${skillData.value}`);
    await actor.update({
      [`data.skills.${skillData.key}.value`]: skillData.value
    });
  }
}
