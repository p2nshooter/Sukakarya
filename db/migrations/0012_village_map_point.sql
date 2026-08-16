-- The map point for the village office.
--
-- `latitude` and `longitude` were NULL, and the Peta Lokasi section refuses to
-- render without them: guessing a point for a village office is worse than
-- showing nothing, because a pin on a government site is read as an address and
-- whoever follows it to the wrong place was sent there by us.
--
-- Supplied by the village and confirmed as read from the map rather than from
-- the example text in Pengaturan Desa - the two happened to be identical, which
-- was worth checking before publishing a pin.
--
-- Four decimal places is roughly ten metres, which is the right precision for
-- "this is the office" without implying a surveyed point.
--
-- Only filled when still unset, so a village that has already moved its pin in
-- Pengaturan Desa keeps what it chose, and a deploy running this again changes
-- nothing.

UPDATE villages
   SET latitude = -6.2419
 WHERE id = 'vil_demo' AND latitude IS NULL;

UPDATE villages
   SET longitude = 107.1523
 WHERE id = 'vil_demo' AND longitude IS NULL;

-- 15 frames the office and the streets around it. 14 was the seeded default and
-- shows roughly twice the area, which reads as "somewhere near here" rather
-- than "this building".
UPDATE villages
   SET map_zoom = 15
 WHERE id = 'vil_demo' AND map_zoom = 14;
