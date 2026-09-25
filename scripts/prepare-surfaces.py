import bpy,sys,os
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=root/'.cache/resource-work/surfaces'
for name,prefix in [('AsphaltTile','asphalt_02'),('ConcreteTile','concrete_floor_worn_001')]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.mesh.primitive_plane_add(size=8);o=bpy.context.object;o.name=name
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=.9
 for suffix,slot in [('diff','Base Color'),('nor_gl','Normal')]:
  tex=n.new('ShaderNodeTexImage');im=bpy.data.images.load(str(source/f'{prefix}_{suffix}_1k.png'));im.scale(512,512)
  if suffix!='diff':im.colorspace_settings.name='Non-Color'
  im.pack();tex.image=im
  if suffix=='nor_gl':nm=n.new('ShaderNodeNormalMap');l.new(tex.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
  else:l.new(tex.outputs['Color'],bs.inputs[slot])
 o.data.materials.append(m);bpy.ops.export_scene.gltf(filepath=str(root/f'public/assets/{name}.glb'),export_format='GLB',export_animations=False,export_image_format='JPEG',export_jpeg_quality=85)
sys.stdout.flush();os._exit(0)
