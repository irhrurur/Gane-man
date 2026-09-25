"""Blender selections from actual Poly Haven modular assets, packed for mobile glTF."""
import bpy,sys,os,json,math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1];source=root/'.cache/resource-work/polyhaven'
selections={
'modular_factory_facade':{'FactoryWindow':['wall_window_centered_large_01','window_centered_large_01'],'FactoryWall':['wall_standard_standard_01'],'FactoryGarage':['wall_door_garage_centered_01','door_garage_centered_01'],'FactoryCornice':['crown_standard_standard_01'],'FactoryPillar':['wall_pier_corner_01']},
'concrete_road_barrier_02':{'RoadBarrier':['concrete_road_barrier_02']},
'Barrel_01':{'OilBarrel':['Barrel_01']},
'modular_fire_escape':{'FireStairs':['modular_fire_escape_stairs'],'FirePlatform':['modular_fire_escape_platform_bottom'],'FireRail':['modular_fire_escape_platform_railing']},
'modular_industrial_pipes_01':{'IndustrialPipe':['modular_industrial_pipes_01_pipe02'],'PipeElbow':['modular_industrial_pipes_01_pipe03']},
'modular_chainlink_fence':{'SecurityFence':['modular_chainlink_fence_double','modular_chainlink_fence_post']},
'utility_box_01':{'UtilityBox':['utility_box_01_box']},
'covered_car':{'CoveredCar':['covered_car','covered_car_wheel_01','covered_car_wheel_02','covered_car_wheel_03','covered_car_wheel_04']}}
report=[]
for pack,models in selections.items():
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source/pack/'source.gltf'))
 for im in bpy.data.images:
  if im.size[0]>512 or im.size[1]>512:im.scale(512,512)
  if im.has_data:im.pack()
 for name,objects in models.items():
  bpy.ops.object.select_all(action='DESELECT');selected=[bpy.data.objects[n] for n in objects]
  for o in selected:o.select_set(True)
  if name.startswith('Factory'):
   for o in selected:
    bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Planar optimization','DECIMATE');dec.decimate_type='DISSOLVE';dec.angle_limit=.015;dec.delimit={'MATERIAL','UV'};bpy.ops.object.modifier_apply(modifier=dec.name)
  if name in ['FactoryWindow','SecurityFence']:
   for o in selected:
    bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Mobile LOD','DECIMATE');dec.ratio=.55 if name=='FactoryWindow' else .45;bpy.ops.object.modifier_apply(modifier=dec.name)
  if name=='RoadBarrier':
   bpy.context.view_layer.objects.active=selected[0];m=selected[0].modifiers.new('Mobile silhouette preservation','DECIMATE');m.ratio=.15;bpy.ops.object.modifier_apply(modifier=m.name)
  # Preserve relative assembly transforms, recenter the entire selected module.
  verts=[o.matrix_world@Vector(v) for o in selected for v in o.bound_box];offset=Vector(((min(v.x for v in verts)+max(v.x for v in verts))/2,(min(v.y for v in verts)+max(v.y for v in verts))/2,min(v.z for v in verts)))
  for o in selected:o.location-=offset
  dest=root/'public/assets'/f'{name}.glb';bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=False,export_image_format='AUTO',export_jpeg_quality=80)
  report.append({'model':name,'pack':pack,'selectedObjects':objects,'bytes':dest.stat().st_size,'license':'CC0-1.0'})
  for o in selected:o.location+=offset
(root/'.cache/resource-work/environment-conversion.json').write_text(json.dumps(report,indent=2));print('EXPORTED',report);sys.stdout.flush();os._exit(0)
