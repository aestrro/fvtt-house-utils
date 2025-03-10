// Register your module with Foundry
Hooks.once('init', async () => {
  console.log('fvtt-house-utils | Initializing FVTT House Utilities Module');

  // Load templates
  await loadTemplates([
    'modules/fvtt-house-utils/templates/custom-skills-section.hbs',
    'modules/fvtt-house-utils/templates/custom-tab.hbs'
  ]);

  // Register settings
  registerSettings();

  // Register custom character sheet
  Actors.registerSheet('dnd5e', CustomCharacterSheet, {
    types: ['character'],
    label: 'Custom Character Sheet',
    makeDefault: game.settings.get('fvtt-house-utils', 'makeDefaultSheet')
  });

  // Register custom skills with the system
  CONFIG.DND5E.skills = {
    ...CONFIG.DND5E.skills,
    defense: {
      label: "Defense",
      ability: "dex"
    },
    shieldSpell: {
      label: "Shield Spell",
      ability: "dex"
    }
  };

  // Add API for other modules to interact with
  game.fvttHouseUtils = {
    api: {
      registerCustomSkill,
      calculateDefensiveSkill,
      calculateShieldSpell,
      getCustomSkills
    },
    version: '1.2.0'
  };

  // Register hooks
  registerHooks();
});

// Function to register custom settings with improved organization and more options
function registerSettings() {
  // Create settings menu
  game.settings.registerMenu('fvtt-house-utils', 'settingsMenu', {
    name: 'House Utilities Settings',
    label: 'Configure Settings',
    hint: 'Configure settings for the FVTT House Utilities module.',
    icon: 'fas fa-cog',
    type: SettingsConfig,
    restricted: true
  });

  // Module activation settings
  game.settings.register('fvtt-house-utils', 'enableCustomSkills', {
    name: 'Enable Custom Skills',
    hint: 'Toggle this to enable the Defense and Shield Spell skills.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: () => window.location.reload()
  });

  game.settings.register('fvtt-house-utils', 'makeDefaultSheet', {
    name: 'Make Default Character Sheet',
    hint: 'If enabled, the custom character sheet will be the default for all characters.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => window.location.reload()
  });

  // Custom skill configuration
  game.settings.register('fvtt-house-utils', 'customDefenseFormula', {
    name: 'Custom Defense Skill Formula',
    hint: 'Formula to calculate the Defense skill. Use @ac for armor class and @dex for dexterity modifier.',
    scope: 'world',
    config: true,
    type: String,
    default: '@ac - 10 + @dex'
  });

  game.settings.register('fvtt-house-utils', 'shieldSpellBonus', {
    name: 'Shield Spell Bonus',
    hint: 'AC bonus provided by the Shield spell.',
    scope: 'world',
    config: true,
    type: Number,
    default: 5,
    range: {
      min: 1,
      max: 10,
      step: 1
    }
  });

  // UI Settings
  game.settings.register('fvtt-house-utils', 'displayMode', {
    name: 'Display Mode',
    hint: 'Choose how to display custom skills on the character sheet.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      "inline": "Inline with standard skills",
      "section": "Separate section",
      "tab": "Custom tab"
    },
    default: "section"
  });

  // Debug mode
  game.settings.register('fvtt-house-utils', 'debugMode', {
    name: 'Debug Mode',
    hint: 'Enable detailed console logging for debugging.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
}

// Enhanced logging function
function log(message, data = null, level = 'log') {
  if (!game.settings.get('fvtt-house-utils', 'debugMode') && level === 'debug') return;

  const prefix = 'fvtt-house-utils | ';
  if (data) {
    console[level](prefix + message, data);
  } else {
    console[level](prefix + message);
  }
}

// Flag to prevent endless loop of updates
let isProcessingUpdate = false;

// Function to register custom hooks with improved error handling and additional hooks
function registerHooks() {
  // Update actors when relevant data changes
  Hooks.on('preUpdateActor', async (actor, updateData, options, userId) => {
    if (isProcessingUpdate) return; // Prevent recursion
    if (!game.settings.get('fvtt-house-utils', 'enableCustomSkills')) return;
    if (game.user.id !== userId) return; // Only process for the user making the change

    try {
      // Start batch updates to improve performance
      isProcessingUpdate = true;

      // Check what properties are being updated to optimize processing
      const relevantUpdate = hasRelevantUpdates(updateData);
      if (!relevantUpdate) {
        isProcessingUpdate = false;
        return;
      }

      log('Recalculating custom skills due to updates', updateData, 'debug');

      // Prepare batch updates
      const updates = {};

      // Calculate Defense skill
      const defenseSkill = calculateDefensiveSkill(actor);
      if (defenseSkill) {
        log('Calculated Defense Skill:', defenseSkill, 'debug');
        if (!actor.system.skills?.defense || actor.system.skills.defense.value !== defenseSkill.value) {
          updates[`system.skills.defense`] = {
            ability: defenseSkill.ability,
            value: defenseSkill.value,
            label: defenseSkill.label,
            proficient: actor.system.skills?.defense?.proficient || 0
          };
        }
      }

      // Calculate Shield Spell skill
      const shieldSpellSkill = calculateShieldSpell(actor);
      if (shieldSpellSkill) {
        log('Calculated Shield Spell Skill:', shieldSpellSkill, 'debug');
        if (!actor.system.skills?.shieldSpell || actor.system.skills.shieldSpell.value !== shieldSpellSkill.value) {
          updates[`system.skills.shieldSpell`] = {
            ability: shieldSpellSkill.ability,
            value: shieldSpellSkill.value,
            label: shieldSpellSkill.label,
            proficient: actor.system.skills?.shieldSpell?.proficient || 0
          };
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        log('Applying skill updates to actor', updates);
        await actor.update(updates, {customSkillsUpdate: true});
      }
    } catch (error) {
      console.error('fvtt-house-utils | Error updating skills:', error);
      ui.notifications.error('Error updating custom skills. See console for details.');
    } finally {
      isProcessingUpdate = false;
    }
  });

  // Handle custom sheet rendering
  Hooks.on('renderActorSheet', (sheet, html, data) => {
    if (!game.settings.get('fvtt-house-utils', 'enableCustomSkills')) return;

    const displayMode = game.settings.get('fvtt-house-utils', 'displayMode');

    // Get custom skills data
    const customSkills = getCustomSkills(sheet.actor);

    try {
      if (displayMode === "inline") {
        // Do nothing special - skills are already integrated in the sheet
      } else if (displayMode === "section") {
        // Create a custom section for our skills
        const customHtml = `
          <div class="custom-skills">
            <h3>Custom Skills</h3>
            <ul class="skills-list">
              ${Object.values(customSkills).map(skill => `
                <li class="skill" data-skill="${skill.key}">
                  <div class="skill-proficiency">
                    <i class="far ${skill.proficient ? 'fa-check-circle' : 'fa-circle'}"></i>
                  </div>
                  <div class="skill-name">${skill.label}</div>
                  <div class="skill-ability">${skill.ability.toUpperCase()}</div>
                  <div class="skill-mod">${skill.value >= 0 ? '+' : ''}${skill.value}</div>
                </li>
              `).join('')}
            </ul>
          </div>
        `;

        // Append the custom HTML to the appropriate section
        html.find('.skills-list').after(customHtml);

        // Add event listeners for proficiency toggling
        html.find('.custom-skills .skill-proficiency').click(async (event) => {
          const skillKey = event.currentTarget.closest('.skill').dataset.skill;
          const currentProficiency = sheet.actor.system.skills[skillKey]?.proficient || 0;
          const newProficiency = currentProficiency ? 0 : 1;

          await sheet.actor.update({
            [`system.skills.${skillKey}.proficient`]: newProficiency
          });
        });
      } else if (displayMode === "tab") {
        // Add a new tab for custom content
        const tabs = html.find('.tabs[data-group="primary"]');
        tabs.append('<a class="item" data-tab="custom">House Rules</a>');

        // Add tab content
        const sheetBody = html.find('.sheet-body');
        sheetBody.append(`
          <div class="tab custom" data-group="primary" data-tab="custom">
            <div class="house-rules-content">
              <h2>Custom Skills</h2>
              <div class="skills-list custom-skills-list">
                ${Object.values(customSkills).map(skill => `
                  <div class="skill flexrow" data-skill="${skill.key}">
                    <div class="skill-proficiency">
                      <i class="far ${skill.proficient ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </div>
                    <div class="skill-name">${skill.label}</div>
                    <div class="skill-ability">${skill.ability.toUpperCase()}</div>
                    <div class="skill-mod">${skill.value >= 0 ? '+' : ''}${skill.value}</div>
                  </div>
                `).join('')}
              </div>

              <h2>House Rules Description</h2>
              <div class="form-group">
                <label>Defense Skill</label>
                <p>This skill represents your character's defensive capabilities and is based on your AC and Dexterity.</p>
              </div>
              <div class="form-group">
                <label>Shield Spell</label>
                <p>This skill represents your AC when you cast the Shield spell as a reaction.</p>
              </div>
            </div>
          </div>
        `);

        // Add event listeners for the new tab
        html.find('.custom-skills-list .skill-proficiency').click(async (event) => {
          const skillKey = event.currentTarget.closest('.skill').dataset.skill;
          const currentProficiency = sheet.actor.system.skills[skillKey]?.proficient || 0;
          const newProficiency = currentProficiency ? 0 : 1;

          await sheet.actor.update({
            [`system.skills.${skillKey}.proficient`]: newProficiency
          });
        });
      }

      // Apply styling
      applyCustomStyles(html);

    } catch (error) {
      console.error('fvtt-house-utils | Error rendering custom content:', error);
    }
  });

  // Add item proficiency updates
  Hooks.on('createItem', async (item, options, userId) => {
    if (item.type !== 'feat' || !item.actor || game.user.id !== userId) return;
    if (!game.settings.get('fvtt-house-utils', 'enableCustomSkills')) return;

    // Check if this is a relevant feat (like Shield Master)
    if (item.name.toLowerCase().includes('shield master')) {
      await updateProficiencyForSkill(item.actor, 'defense', 1);
      ui.notifications.info(`${item.actor.name} gained proficiency in Defense from Shield Master feat.`);
    }
  });

  // Add compatibility with other popular modules
  Hooks.on('ready', () => {
    // Check for Better Rolls module
    if (game.modules.get('betterrolls5e')?.active) {
      log('Better Rolls 5e detected, registering compatibility hooks');
      registerBetterRollsCompatibility();
    }

    // Notify about module initialization
    if (game.user.isGM) {
      ui.notifications.info('FVTT House Utilities ready - Custom skills enabled.');
    }
  });
}

// Function to check if updateData contains properties we care about
function hasRelevantUpdates(updateData) {
  // Check if AC or abilities are being updated
  if (updateData.system?.attributes?.ac) return true;
  if (updateData.system?.abilities?.dex) return true;

  // Check if custom skills are being directly updated
  if (updateData.system?.skills?.defense && !updateData.customSkillsUpdate) return true;
  if (updateData.system?.skills?.shieldSpell && !updateData.customSkillsUpdate) return true;

  return false;
}

// Function to apply custom styles
function applyCustomStyles(html) {
  const style = document.createElement('style');
  style.id = 'fvtt-house-utils-styles';
  style.textContent = `
    .custom-skills {
      margin-top: 1em;
      padding: 0.5em;
      border: 1px solid #c9c7b8;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.05);
    }
    .custom-skills h3 {
      margin: 0 0 0.5em 0;
      font-family: "Modesto Condensed", "Palatino Linotype", serif;
      font-size: 16px;
      font-weight: 700;
    }
    .custom-skills .skills-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .custom-skills .skill {
      display: flex;
      align-items: center;
      padding: 3px 0;
    }
    .custom-skills .skill-proficiency {
      flex: 0 0 20px;
      text-align: center;
      cursor: pointer;
    }
    .custom-skills .skill-name {
      flex: 1;
      margin: 0 5px;
    }
    .custom-skills .skill-ability {
      flex: 0 0 30px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    .custom-skills .skill-mod {
      flex: 0 0 30px;
      text-align: center;
      font-weight: bold;
    }
    .tab.custom .house-rules-content {
      padding: 10px;
    }
    .tab.custom h2 {
      border-bottom: 1px solid #c9c7b8;
      margin-bottom: 10px;
      padding-bottom: 5px;
    }
    .custom-skills-list {
      margin-bottom: 20px;
    }
  `;

  // Add or replace the style element
  const existingStyle = html.find('#fvtt-house-utils-styles');
  if (existingStyle.length) {
    existingStyle.replaceWith(style);
  } else {
    html.find('head').append(style);
  }
}

// Function to update proficiency for a skill
async function updateProficiencyForSkill(actor, skillKey, profValue) {
  return actor.update({
    [`system.skills.${skillKey}.proficient`]: profValue
  });
}

// Function to calculate the "Defense" skill with custom formula support
function calculateDefensiveSkill(actor) {
  const actorData = actor.system;

  if (!actorData.attributes || !actorData.attributes.ac) return null;

  const baseAC = actorData.attributes.ac.value || 10;
  const dexMod = actorData.abilities?.dex?.mod || 0;

  // Use custom formula if provided
  const formula = game.settings.get('fvtt-house-utils', 'customDefenseFormula');
  let skillValue;

  try {
    // Replace variables in formula
    const processedFormula = formula
      .replace(/@ac/g, baseAC)
      .replace(/@dex/g, dexMod);

    // Evaluate the formula
    skillValue = new Roll(processedFormula).evaluate({async: false}).total;
  } catch (error) {
    console.error('fvtt-house-utils | Error evaluating custom defense formula:', error);
    // Fallback to original formula
    skillValue = baseAC - 10 + dexMod;
  }

  return {
    key: 'defense',
    label: 'Defense',
    value: Math.floor(skillValue),
    ability: 'dex',
    proficient: actor.system.skills?.defense?.proficient || 0
  };
}

// Function to calculate the "Shield Spell" skill
function calculateShieldSpell(actor) {
  const actorData = actor.system;

  if (!actorData.attributes || !actorData.attributes.ac) return null;

  const shieldSpellBonus = game.settings.get('fvtt-house-utils', 'shieldSpellBonus');
  const baseAC = actorData.attributes.ac.value || 10;
  const skillValue = baseAC - 10 + shieldSpellBonus;

  return {
    key: 'shieldSpell',
    label: 'Shield Spell',
    value: skillValue,
    ability: 'dex',
    proficient: actor.system.skills?.shieldSpell?.proficient || 0
  };
}

// Function to get all custom skills for an actor
function getCustomSkills(actor) {
  const skills = {};

  const defenseSkill = calculateDefensiveSkill(actor);
  if (defenseSkill) {
    skills[defenseSkill.key] = defenseSkill;
  }

  const shieldSpellSkill = calculateShieldSpell(actor);
  if (shieldSpellSkill) {
    skills[shieldSpellSkill.key] = shieldSpellSkill;
  }

  return skills;
}

// API function to register custom skills
function registerCustomSkill(key, label, abilityKey, calculateFunction) {
  if (typeof calculateFunction !== 'function') {
    throw new Error('Calculate function must be a function');
  }

  // Register with the system
  CONFIG.DND5E.skills[key] = {
    label,
    ability: abilityKey
  };

  // Add a hook to calculate this skill
  Hooks.on('preUpdateActor', async (actor, updateData, options, userId) => {
    if (isProcessingUpdate) return;
    if (!game.settings.get('fvtt-house-utils', 'enableCustomSkills')) return;
    if (game.user.id !== userId) return;

    try {
      const skillData = calculateFunction(actor);
      if (skillData) {
        const existingSkill = actor.system.skills?.[key];

        if (!existingSkill || existingSkill.value !== skillData.value) {
          isProcessingUpdate = true;
          await actor.update({
            [`system.skills.${key}`]: {
              ability: abilityKey,
              value: skillData.value,
              label: label,
              proficient: existingSkill?.proficient || 0
            }
          }, {customSkillsUpdate: true});
          isProcessingUpdate = false;
        }
      }
    } catch (error) {
      console.error(`fvtt-house-utils | Error calculating custom skill ${key}:`, error);
    }
  });

  log(`Registered custom skill: ${label} (${key})`);
  return true;
}

// Better Rolls compatibility
function registerBetterRollsCompatibility() {
  Hooks.on('betterRolls5e.buildSkillCard', (actor, skillId, card) => {
    // Add our custom skills to Better Rolls
    const customSkills = getCustomSkills(actor);
    if (customSkills[skillId]) {
      card.skillId = skillId;
      card.data.mod = customSkills[skillId].value;
      card.data.ability = customSkills[skillId].ability;
    }
  });
}

// Enhanced Custom Character Sheet with proper inheritance and more features
class CustomCharacterSheet extends dnd5e.applications.actor.ActorSheet5eCharacter2 {
  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push('fvtt-house-utils');
    options.width = options.width + 50; // Make slightly wider for custom content
    options.tabs = options.tabs || [];
    options.tabs.push({navSelector: '.tabs[data-group="primary"]', contentSelector: '.sheet-body', initial: 'attributes'});
    return options;
  }

  /** @override */
  async getData(options) {
    const data = await super.getData(options);

    if (game.settings.get('fvtt-house-utils', 'enableCustomSkills')) {
      // Get custom skills
      const customSkills = getCustomSkills(this.actor);

      // Add to data for template rendering
      data.customSkills = customSkills;

      // Ensure skills exist in the data structure for proper display
      if (!data.skills) data.skills = {};

      // Add custom skills to skills data for rendering in the standard skills section
      Object.values(customSkills).forEach(skill => {
        data.skills[skill.key] = {
          value: skill.value,
          ability: skill.ability,
          label: skill.label,
          proficient: this.actor.system.skills?.[skill.key]?.proficient || 0,
          mod: skill.value // For display
        };
      });
    }

    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Add any custom event listeners for our sheet
    if (game.settings.get('fvtt-house-utils', 'enableCustomSkills')) {
      // Example: Add tooltips for custom skills
      html.find('.custom-skills .skill').hover(
        function() { $(this).addClass('hover'); },
        function() { $(this).removeClass('hover'); }
      );

      // Allow skill rolls from our custom tab
      html.find('.custom-skills-list .skill-mod').click(ev => {
        const skillKey = ev.currentTarget.closest('.skill').dataset.skill;
        this.actor.rollSkill(skillKey, {event: ev});
      });
    }
  }
}