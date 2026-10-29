/**
 * lib/shopCatalog — everything Starlight can bring into the walk, and its
 * price. The ONE place prices live (the server function's table in
 * supabase/migrations/008_starlight_shop.sql mirrors it).
 *
 * Kinds (what the person sees in the Map):
 *   place    Places        a whole scenery: backdrop, ground or water, path or bridge
 *   trees    Trees         trees behind Sísí (and, where they fit, one near now and then)
 *   flowers  Flowers       one set: the bank behind the path and the flowers in front
 *   lives    Little lives  butterflies (free, a colour to choose), fish, a little bird
 *
 * Owning is forever. Choosing, swapping or hiding what you own costs nothing.
 */

import type { WorldId } from "@/lib/starlight";

export type ItemKind = "place" | "trees" | "flowers" | "lives";

export type ShopItem = {
  id: string;
  kind: ItemKind;
  name: string;
  price: number;
  /** the word on the button: "✦6 · Plant" */
  verb: "Open" | "Plant" | "Bring along";
  /** where it can be used (absent: every place) */
  places?: WorldId[];
  /** shown when it can't be used here: "Meet it at the pond." */
  elsewhere?: string;
  /** the card picture: the item in a place it suits (square, public/V2/themes/cards) */
  preview: string;
  /** for a place item: which place it opens */
  place?: WorldId;
};

const T = "/V2/themes/bridge-pond/";
const F = "/V2/themes/butterfly-forest/";
const C = "/V2/themes/cards/items/";

export const CATALOG: ShopItem[] = [
  { id: "place:bridge-pond", kind: "place", name: "Bridge & Pond", price: 15, verb: "Open", place: "bridge-pond", preview: `${T}preview.webp` },
  { id: "place:butterfly-forest", kind: "place", name: "Butterfly Forest", price: 25, verb: "Open", place: "butterfly-forest", preview: `${F}preview.webp` },

  { id: "trees:teal", kind: "trees", name: "Teal trees", price: 6, verb: "Plant", places: ["quiet-meadow", "butterfly-forest"], elsewhere: "Grows in the meadow or the forest.", preview: `${C}trees-teal.webp` },
  { id: "trees:willow", kind: "trees", name: "Willows", price: 6, verb: "Plant", places: ["bridge-pond"], elsewhere: "Grows by the pond.", preview: `${C}trees-willow.webp` },
  { id: "trees:forest-big", kind: "trees", name: "Great forest trees", price: 6, verb: "Plant", places: ["butterfly-forest"], elsewhere: "Grows in the forest.", preview: `${C}trees-forest-big.webp` },

  { id: "flowers:pond-reeds", kind: "flowers", name: "Pond reeds", price: 6, verb: "Plant", preview: `${C}flowers-pond-reeds.webp` },
  { id: "flowers:forest", kind: "flowers", name: "Forest flowers", price: 6, verb: "Plant", preview: `${C}flowers-forest.webp` },

  { id: "lives:butterflies", kind: "lives", name: "Butterflies", price: 0, verb: "Bring along", preview: `${C}lives-butterflies.webp` },
  { id: "lives:fish", kind: "lives", name: "Fish", price: 4, verb: "Bring along", places: ["bridge-pond"], elsewhere: "Swims at the pond.", preview: `${C}lives-fish.webp` },
  { id: "lives:bird", kind: "lives", name: "A little bird", price: 6, verb: "Bring along", preview: `${C}lives-bird.webp` },
];

/** always yours: the meadow (sky, ground, its path and grass) and Sísí */
export const BASE_PLACE: WorldId = "quiet-meadow";

export const itemById = (id: string) => CATALOG.find((i) => i.id === id);
export const placeItem = (place: WorldId) => CATALOG.find((i) => i.kind === "place" && i.place === place);
export function fitsPlace(item: ShopItem, place: WorldId): boolean {
  return !item.places || item.places.includes(place);
}
