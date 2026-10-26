import { newDemoContent } from './demo-template.js';
import { validateContent, type ValidatedContent } from '../domain/demo-content.js';

// Checked byte-for-value against the versioned synthetic source template by the
// kitchen-content tests. No browser-side catalog, real staff, or stock records.
const kitchenTemplate = {
  "stations": [
    {
      "id": "station-fry",
      "label": "Fry",
      "responsiblePersonId": "person-casey"
    },
    {
      "id": "station-cold-prep",
      "label": "Cold Prep",
      "responsiblePersonId": "person-morgan"
    },
    {
      "id": "station-hot-prep",
      "label": "Hot Prep",
      "responsiblePersonId": "person-sam"
    }
  ],
  "people": [
    {
      "id": "person-casey",
      "displayLabel": "Casey (fictional)",
      "roleLabel": "Fry cook"
    },
    {
      "id": "person-morgan",
      "displayLabel": "Morgan (fictional)",
      "roleLabel": "Cold prep cook"
    },
    {
      "id": "person-sam",
      "displayLabel": "Sam (fictional)",
      "roleLabel": "Hot prep cook"
    }
  ],
  "equipment": [
    {
      "id": "equipment-fryer",
      "label": "Fryer",
      "kind": "EQUIPMENT"
    },
    {
      "id": "tool-fry-basket",
      "label": "Fry basket",
      "kind": "TOOL"
    },
    {
      "id": "tool-tongs",
      "label": "Tongs",
      "kind": "TOOL"
    },
    {
      "id": "tool-mixing-bowl",
      "label": "Mixing bowl",
      "kind": "TOOL"
    },
    {
      "id": "tool-cutting-board",
      "label": "Cutting board",
      "kind": "TOOL"
    },
    {
      "id": "tool-prep-knife",
      "label": "Prep knife",
      "kind": "TOOL"
    },
    {
      "id": "equipment-range",
      "label": "Range",
      "kind": "EQUIPMENT"
    },
    {
      "id": "tool-saucepan",
      "label": "Saucepan",
      "kind": "TOOL"
    }
  ],
  "inventory": [
    {
      "equipmentId": "equipment-fryer",
      "stationId": "station-fry",
      "quantity": 1
    },
    {
      "equipmentId": "tool-fry-basket",
      "stationId": "station-fry",
      "quantity": 2
    },
    {
      "equipmentId": "tool-tongs",
      "stationId": null,
      "quantity": 3
    },
    {
      "equipmentId": "tool-mixing-bowl",
      "stationId": null,
      "quantity": 4
    },
    {
      "equipmentId": "tool-cutting-board",
      "stationId": "station-cold-prep",
      "quantity": 2
    },
    {
      "equipmentId": "tool-prep-knife",
      "stationId": "station-cold-prep",
      "quantity": 2
    },
    {
      "equipmentId": "equipment-range",
      "stationId": "station-hot-prep",
      "quantity": 1
    },
    {
      "equipmentId": "tool-saucepan",
      "stationId": "station-hot-prep",
      "quantity": 2
    }
  ],
  "recipes": [
    {
      "id": "recipe-potato-wedges",
      "title": "Fictional sample: Potato wedges",
      "stationId": "station-fry",
      "servings": 1,
      "ingredients": [
        "1 sample portion potato wedges",
        "1 pinch sample seasoning"
      ],
      "steps": [
        "Review the approved station procedure with the fictional fry cook before preparation.",
        "Use the practice ticket to identify the sample portion and seasoning.",
        "Compare the sample item and ticket name before the practice handoff."
      ],
      "requirements": [
        {
          "equipmentId": "equipment-fryer",
          "quantity": 1
        },
        {
          "equipmentId": "tool-fry-basket",
          "quantity": 1
        },
        {
          "equipmentId": "tool-tongs",
          "quantity": 1
        }
      ],
      "reference": "Fictional planning sample only, not a cooking or food-safety procedure. General handoff practice remains the scored training."
    },
    {
      "id": "recipe-garden-slaw",
      "title": "Fictional sample: Garden slaw",
      "stationId": "station-cold-prep",
      "servings": 2,
      "ingredients": [
        "2 cups sample shredded cabbage",
        "1 sample carrot",
        "2 spoonfuls sample dressing"
      ],
      "steps": [
        "Review the approved station procedure with the fictional cold prep cook.",
        "Combine the prepared sample vegetables and dressing in the sample bowl.",
        "Read back any sample ticket change before the practice handoff."
      ],
      "requirements": [
        {
          "equipmentId": "tool-cutting-board",
          "quantity": 1
        },
        {
          "equipmentId": "tool-prep-knife",
          "quantity": 1
        },
        {
          "equipmentId": "tool-mixing-bowl",
          "quantity": 1
        },
        {
          "equipmentId": "tool-tongs",
          "quantity": 1
        }
      ],
      "reference": "Fictional planning sample only, not a cooking or food-safety procedure. General handoff practice remains the scored training."
    },
    {
      "id": "recipe-vegetable-soup",
      "title": "Fictional sample: Vegetable soup",
      "stationId": "station-hot-prep",
      "servings": 2,
      "ingredients": [
        "2 cups sample vegetable stock",
        "1 cup sample prepared vegetables"
      ],
      "steps": [
        "Review the approved station procedure with the fictional hot prep cook before preparation.",
        "Use the practice ticket to identify the sample soup and portions.",
        "Pass on any unresolved sample ticket question with its reference and next action."
      ],
      "requirements": [
        {
          "equipmentId": "equipment-range",
          "quantity": 1
        },
        {
          "equipmentId": "tool-saucepan",
          "quantity": 1
        },
        {
          "equipmentId": "tool-mixing-bowl",
          "quantity": 1
        }
      ],
      "reference": "Fictional planning sample only, not a cooking or food-safety procedure. General handoff practice remains the scored training."
    }
  ]
} as const;

export function newStationDemoContent(organizationId: string, makeId: () => string): ValidatedContent {
  const original = newDemoContent(organizationId, makeId);
  return validateContent({
    ...original.content, schemaVersion: '1.2.0', version: '1.2.0', ...kitchenTemplate,
  });
}
