export function adultPackError(input: {
  cleanFilter: boolean
  adultConfirmed: boolean
  hasAdultPack: boolean
}) {
  if (input.cleanFilter && input.hasAdultPack) {
    return "Turn off the clean filter or drop the 18+ pack."
  }
  if (input.hasAdultPack && !input.adultConfirmed) {
    return "Confirm this room is 18+ before using an adult pack."
  }
  return null
}
