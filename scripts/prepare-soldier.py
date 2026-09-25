"""Blender 4.2: repair legacy materials, bake supplied IK animation, export armored infantry.
Run with LD_LIBRARY_PATH pointing to the development-only Blender runtime libraries.
Original Unvanquished media and this adapted model are CC BY-SA 2.5.
"""
import bpy,os,json,math,sys
import numpy as np
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=root/'.cache/resource-work/soldier';out=root/'public/assets/Infantry.glb'
bpy.ops.wm.open_mainfile(filepath=str(source/'human_male.blend'))
rig=bpy.data.objects['Armature'];rig.hide_set(False);rig.hide_render=False
for o in list(bpy.data.objects):
 if o.name in ['Plane','rifle','shotugnbody01','models/weapons/psaw/saw_thirdperson','tag_flash']:bpy.data.objects.remove(o,do_unlink=True)
textures={'body':('base.png','base_n.png'),'armor':('armor_medium.png','armor_n.png'),'head':('head.jpg','head_n.jpg'),'helmet':('helmet_medium.png','helmet_n.png')}
for key,(color,normal) in textures.items():
 m=bpy.data.materials.get('models/players/human_male/'+key);m.use_nodes=True;m.node_tree.nodes.clear();n=m.node_tree.nodes;l=m.node_tree.links;bs=n.new('ShaderNodeBsdfPrincipled');bs.inputs['Roughness'].default_value=.72;bs.inputs['Metallic'].default_value=.12 if key in ['armor','helmet'] else 0;output=n.new('ShaderNodeOutputMaterial');l.new(bs.outputs['BSDF'],output.inputs[0]);c=n.new('ShaderNodeTexImage');im=bpy.data.images.load(str(source/color));im.scale(512,512)
 if key in ['armor','helmet','body']:
  pixels=np.array(im.pixels[:],dtype=np.float32).reshape(-1,4);gray=pixels[:,:3]@np.array([.2126,.7152,.0722]);pixels[:,:3]=(pixels[:,:3]*.18+gray[:,None]*.82)*np.array([.78,.82,.70]);im.pixels[:]=pixels.ravel();im.update()
 im.pack();c.image=im;l.new(c.outputs['Color'],bs.inputs['Base Color']);no=n.new('ShaderNodeTexImage');im=bpy.data.images.load(str(source/normal));im.colorspace_settings.name='Non-Color';im.scale(512,512);im.pack();no.image=im;nm=n.new('ShaderNodeNormalMap');l.new(no.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
# Discard the authored rig's demonstration props, keep armor, body, face, and helmet.
for o in bpy.data.objects:
 if o.type=='MESH':o.hide_set(False);o.hide_render=False
rig.animation_data_clear();rig.animation_data_create();bpy.context.scene.render.fps=60
# These are source clips, not generated keyframe approximations.
clips={'idle':('Idle',0,180,1),'walk':('Walk',0,70,1),'run':('Run',0,90,2),'crouch':('Crouch',0,10,1),'crouch_forward':('CrouchWalk',0,70,1),'jump':('Jump',0,10,1),'land':('Land',0,12,1),'attack':('Shoot',0,16,1),'death2':('Death',0,40,1),'raise':('Raise',0,11,1),'drop':('Lower',0,11,1),'rally':('Interact',0,151,1)}
originals={k:bpy.data.actions[k] for k in clips};baked=[]
# Visual-pose bake preserves old IK constraints in modern glTF without exporting controllers.
for source_name,(name,start,end,speed) in clips.items():
 rig.animation_data.action=originals[source_name]
 bpy.context.view_layer.objects.active=rig;bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 bpy.context.scene.frame_set(start)
 bpy.ops.nla.bake(frame_start=start,frame_end=end,step=2,only_selected=False,visual_keying=True,clear_constraints=False,clear_parents=False,use_current_action=False,bake_types={'POSE'})
 a=rig.animation_data.action;a.name='EXPORT_'+name
 for fc in a.fcurves:
  for k in fc.keyframe_points:k.co.x/=speed;k.handle_left.x/=speed;k.handle_right.x/=speed
 a.use_fake_user=True;baked.append(a)
for a in list(bpy.data.actions):
 if a not in baked:bpy.data.actions.remove(a)
for a in baked:a.name=a.name.removeprefix('EXPORT_')
for bone in rig.pose.bones:
 for c in list(bone.constraints):bone.constraints.remove(c)
rig.animation_data.action=next(a for a in baked if a.name=='Idle');bpy.context.scene.frame_set(0)
# Source unit conversion is retained; runtime normalizes model height to 1.85 m.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=2,export_skins=True,export_def_bones=True,export_image_format='JPEG',export_jpeg_quality=85,export_anim_slide_to_zero=True)
print('EXPORTED',out,out.stat().st_size);sys.stdout.flush();os._exit(0)
