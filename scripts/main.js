Hooks.once('ready', () => {
  registerParryDodgeSkill();
});

/**
 * Register a new Parry/Dodge skill for all characters
 */
async function registerParryDodgeSkill() {
  // Loop through all actors and add the new Parry/Dodge skill to characters
  game.actors.forEach(async (actor) => {
    // Check if the actor is a character and does not already have Parry/Dodge
    if (actor.type === 'character' && !actor.system.skills.parry) {

      // Get the character's Dexterity modifier
      const dexModifier = actor.system.abilities.dex.mod;

      // Define the new Parry/Dodge skill data
      const parryDodgeSkillData = {
        value: dexModifier, // Set the skill value to the Dexterity modifier
        proficiency: null, // No proficiency bonus by default
        ability: 'dex', // Link to Dexterity ability score
        description: 'A defensive skill that represents the ability to parry or dodge incoming attacks.',
      };

      // Update the actor with the new Parry/Dodge skill
      await actor.update({
        'system.skills.parry': parryDodgeSkillData,
      });
    }
  });
}