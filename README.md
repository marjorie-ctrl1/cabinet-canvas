# Cabinet Canvas

Build a browser-based 3D cabinet and organizer planning app.

IMPORTANT: This is a REAL WORKING APPLICATION, not a mockup or static UI. The core interaction must work.

The app is essentially “Canva meets The Sims, but for organizing cabinets, drawers, shelves, and storage spaces.”

I am a non-technical user. After you build the app, I should NOT need to edit code to use it or add new cabinets/organizers. Everything that a normal user would need to change must be possible through the GUI.

TECHNICAL DIRECTION

Use a proper 3D web rendering system such as Three.js / React Three Fiber if appropriate.

The app should run entirely in the browser.

Use persistent browser storage such as localStorage for the first version so my cabinets, organizers, and layouts remain after refreshing the page.

Do NOT build a fake 3D interface using flat images.

Do NOT create placeholder buttons for the core functionality.

Prioritize working interaction over visual polish.

1. MAIN CONCEPT

The user creates:

Cabinets / storage spaces

Organizers

Layouts

The user then drags organizers from an inventory into a cabinet in 3D space.

The dimensions entered by the user must correspond to the actual dimensions of the objects.

For example:

Cabinet:
Width: 60 cm
Depth: 40 cm
Height: 80 cm

Organizer:
Width: 20 cm
Depth: 30 cm
Height: 10 cm

The relative proportions in the 3D scene should reflect those dimensions.

2. MAIN SCREEN

Create a clean application layout with:

LEFT SIDEBAR:

Cabinets

Organizers

Layouts

CENTER:

Large interactive 3D viewport

RIGHT SIDEBAR:

Properties of the currently selected object

The overall interaction should feel simple and visual, somewhere between Canva and The Sims.

3. CREATE CABINET

Add a prominent:

“+ New Cabinet”

button.

When clicked, open a GUI form with:

Name

Width (cm)

Depth (cm)

Height (cm)

Example:

Name: Bathroom Cabinet
Width: 60
Depth: 40
Height: 80

When the user clicks Create:

Create the cabinet in the 3D scene

Add it to the Cabinets list

Allow the cabinet to be selected later

Save it persistently

The user must never have to edit source code to create another cabinet.

4. CREATE ORGANIZER

Add:

“+ New Organizer”

button.

The form must contain:

Name

Width (cm)

Depth (cm)

Height (cm)

Quantity

Example:

Name: Small Acrylic Bin
Width: 15
Depth: 25
Height: 10
Quantity: 4

After creation:

Add it to the Organizer Inventory

Display its quantity

Allow the user to drag it into a cabinet

Save it persistently

IMPORTANT:

Quantity means the number of organizers I am considering buying for planning purposes.

This is NOT a real shopping/inventory system.

If I enter quantity = 4, I should be able to place up to 4 copies into layouts.

5. 3D CABINET

The cabinet must be a real 3D object with:

Width

Depth

Height

Visible interior space

The user must be able to:

Orbit around the cabinet

Zoom

Pan

Select it

Rotate the camera around it

Use intuitive mouse controls.

The interior should be visually understandable.

6. ORGANIZERS

Organizers should appear as simple 3D boxes for the MVP.

Different organizer types do NOT need realistic models yet.

A box is sufficient.

However:

THE DIMENSIONS MUST BE ACCURATE.

If an organizer is 20 × 30 × 10 cm, its 3D representation must use those proportions.

Display the organizer name and/or dimensions when selected.

7. DRAG AND DROP

This is one of the MOST IMPORTANT features.

I should be able to:

See organizers in the inventory/sidebar.

Grab an organizer.

Drag it into the cabinet.

Drop it somewhere inside the cabinet.

Move it around afterward.

The interaction should feel as close as reasonably possible to dragging objects around in a simple 3D game.

Do NOT require me to type X/Y/Z coordinates just to place an organizer.

8. FITTING LOGIC

The app must understand the actual dimensions of objects.

If an organizer fits inside the available cabinet space:

→ normal appearance.

If an organizer extends outside the available space:

→ make the organizer visibly RED.

IMPORTANT:

Do NOT prevent me from placing an object that does not fit.

I want to be able to experiment.

So:

FIT = normal

DOES NOT FIT = red warning, but placement is still allowed.

9. OVERLAPPING OBJECTS

Use actual 3D spatial collision/overlap logic.

If two organizers occupy the same physical space:

→ indicate the conflict visually, preferably with red highlighting.

If organizers can physically coexist without occupying the same space:

→ they are allowed.

Stacking should be allowed.

For example:

Cabinet shelf:
60 × 40 × 30 cm

Organizer A:
20 × 30 × 10 cm

Organizer B:
20 × 30 × 10 cm

If B can physically sit above A, that should be allowed.

Do NOT simply prohibit all overlapping bounding boxes in the scene.

The system needs to consider actual 3D position and dimensions.

10. ROTATION

Selected organizers should be rotatable.

At minimum:

Rotate 90°

Rotate back 90°

The dimensions and fit calculation must update after rotation.

Example:

Organizer:
20 × 30 × 10

After rotating:

30 × 20 × 10

The system should treat those dimensions accordingly.

11. SELECTION

When I click an organizer:

Highlight it

Show its properties in the right sidebar

Show:

Name
Width
Depth
Height
Current position
Rotation

I should be able to delete it.

I should also be able to move it again.

12. CABINET COMPONENTS — IMPORTANT ARCHITECTURE

The final application will eventually need cabinets containing real components such as:

drawers

shelves

compartments

doors

separate storage sections

But DO NOT overcomplicate the first version.

For the MVP, implement the architecture so that a cabinet can eventually contain multiple independent “spaces/components.”

For now, a cabinet can contain one main interior space.

The system should be designed so we can add:

“+ Add Shelf”

and

“+ Add Drawer”

in a later iteration without rebuilding the entire application.

13. INVENTORY

The organizer inventory should show cards such as:

Small Acrylic Bin
20 × 30 × 10 cm
Quantity: 4

When an organizer is placed into the scene:

Quantity decreases visually.

If I delete the placed organizer:

Quantity becomes available again.

However, NEVER allow the quantity to become negative.

14. SAVED LAYOUTS

Add a simple Layout system.

I should be able to:

Create layout

Name layout

Save layout

Load layout

Delete layout

Example:

“Bathroom Cabinet — Option 1”

“Bathroom Cabinet — Option 2”

The purpose is to compare different possible organizer arrangements before buying anything.

15. IMPORTANT USER EXPERIENCE RULE

I am NOT a programmer.

I should never need to:

edit JavaScript

edit JSON

edit database records

modify source code

manually change object coordinates

modify configuration files

Everything must be controllable through the GUI.

The code is the ENGINE.

The GUI is the PRODUCT.

16. FIRST VERSION PRIORITIES

Do NOT attempt to implement every possible feature at once.

The first working version should prioritize these features in this exact order:

Working 3D viewport

Create cabinet through GUI

Create organizer through GUI

Accurate 3D dimensions

Organizer inventory

Drag organizer into cabinet

Move organizer around in 3D

Rotate organizer

Fit / out-of-bounds detection

Basic collision detection

Save/load data

Only after these work should you add advanced features or visual polish.

17. DEVELOPMENT RULE

Build this as a REAL MVP.

Do not spend most of the implementation creating elaborate UI screens while the 3D interaction does not work.

After each major feature, make sure the application still runs.

If a feature is technically difficult, implement the simplest functional version rather than replacing it with a fake button or placeholder.

Do not ask me to manually modify code.

Do not require me to understand the implementation.

At the end of this first build, I should be able to open the application and do this:

Create a cabinet.

Create an organizer.

See the organizer in inventory.

Drag the organizer into the cabinet.

Move it around.

Rotate it.

See whether it physically fits.

Create another organizer.

Place multiple organizers.

Save the arrangement.

Start by building this MVP now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0ce2c13b-d26f-5a3b-9c1c-b83139636fe2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
