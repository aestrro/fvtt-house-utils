// Register your module with Foundry
Hooks.once('init', () => {
  console.log('fvtt-house-utils | Initializing FVTT House Utilities Module');
  registerSettings();
  registerHooks();

  // Register custom character sheet
  Actors.registerSheet('dnd5e', CustomCharacterSheet, { types: ['character'], label: 'Custom Character Sheet' });
});

Hooks.on('renderActorSheet', (sheet, html, data) => {
  // Add custom HTML dynamically
  const customHtml = `
    <div class="custom-skills">
      <h3>Custom Skills</h3>
      <ul>
        ${Object.values(data.customSkills || {}).map(skill => `
          <li><strong>${skill.label}:</strong> ${skill.value}</li>
        `).join('')}
      </ul>
    </div>
  `;

  // Append the custom HTML to a specific section
  html.find('.attributes').append(customHtml);
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

// Flag to prevent endless loop of updates
let isProcessingUpdate = false;

// Function to register custom hooks
function registerHooks() {
  Hooks.on('preUpdateActor', async (actor, updateData) => {
    if (isProcessingUpdate) return; // Prevent recursion
    if (!game.settings.get('fvtt-house-utils', 'enableCustomSkills')) return;

    isProcessingUpdate = true; // Set flag to indicate an update is being processed

    try {
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
    } catch (error) {
      console.error('fvtt-house-utils | Error updating skills:', error);
    } finally {
      isProcessingUpdate = false; // Reset the flag after processing
    }
  });
}

// Function to calculate the "Defense" skill
function calculateDefensiveSkill(actor) {
  const actorData = actor.system;

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
  const actorData = actor.system;

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
  const existingSkill = actor.system.skills?.[skillData.key];

  if (!existingSkill) {
    // Add the skill if it doesn't exist
    console.log(`fvtt-house-utils | Adding '${skillData.label}' to ${actor.name}`);
    await actor.update({
      [`system.skills.${skillData.key}`]: {
        ability: skillData.ability,
        value: skillData.value,
        label: skillData.label
      }
    });
  } else if (existingSkill.value !== skillData.value) {
    // Update the skill if the value has changed
    console.log(`fvtt-house-utils | Updating '${skillData.key}' for ${actor.name} to ${skillData.value}`);
    await actor.update({
      [`system.skills.${skillData.key}.value`]: skillData.value
    });
  }
}


class CustomCharacterSheet extends dnd5e.applications.actor.ActorSheet5eCharacter2 {
  /** @override */
  async getData(options) {
    const data = await super.getData(options);

    // Add custom skills to the skills list
    data.skills = {
      ...data.skills, // Keep existing skills
      defense: {
        value: data.actor.system.attributes.ac.value - 10 + data.actor.system.abilities.dex.mod,
        ability: "dex",
        label: "Defense",
        proficient: 0 // Default proficiency
      },
      shieldSpell: {
        value: data.actor.system.attributes.ac.value - 10 + 5,
        ability: "dex",
        label: "Shield Spell",
        proficient: 0 // Default proficiency
      }
    };

    return data;
  }
}