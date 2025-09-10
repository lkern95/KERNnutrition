import React from 'react';
import { BottomNavigation } from './BottomNavigation';

export default {
  title: 'Components/BottomNavigation',
  component: BottomNavigation,
};

export const Default = () => <BottomNavigation />;

Default.storyName = 'Default (Visual Regression)';

// Screenshot-Note: Prüfe visuell, ob alle Tabs gleich hoch, Icons zentriert, Labels einzeilig (text-ellipsis),
// Line-Height identisch selected/unselected, kein Reflow bei Tab-Wechsel (type "fixed" Verhalten).
// Siehe Aufgabenbeschreibung für Details.
