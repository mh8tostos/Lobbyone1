export function normalizeHotelName(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

export function getEventHotelName(eventData = {}) {
  return (
    eventData.hotelName ||
    eventData.hotel ||
    eventData.venueName ||
    eventData.placeName ||
    ''
  );
}

export function getHotelNameLower(eventData = {}) {
  if (eventData.hotelNameLower) {
    return normalizeHotelName(eventData.hotelNameLower);
  }

  return normalizeHotelName(getEventHotelName(eventData));
}
