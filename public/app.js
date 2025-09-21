// public/app.js
const api = (path, opts={}) =>
    fetch('/api'+path, { headers:{'Content-Type':'application/json'}, ...opts })
     .then(r=>r.json());
 
 const projectSelect = document.getElementById('projectSelect');
 const newProjectBtn = document.getElementById('newProjectBtn');
 const refreshBtn = document.getElementById('refreshBtn');
 const taskForm = document.getElementById('taskForm');
 const dependsSelect = document.getElementById('depends_on');
 let currentProject = null;
 let tasksCache = [];
 
 function normalizeStatus(s) {
   if (!s) return '';
   s = String(s).trim().toLowerCase();
   if (s === 'in progress') s = 'in-progress';
   if (s === 'completed' || s === 'complete') s = 'done';
   return s;
 }
 function isDone(s) {
   return ['done','completed','complete'].includes((s||'').toString().toLowerCase());
 }
 
 async function loadProjects() {
   const projects = await api('/projects');
   projectSelect.innerHTML = '';
   projects.forEach(p => {
     const opt = document.createElement('option');
     opt.value = p.id;
     opt.textContent = `${p.id}: ${p.name}`;
     projectSelect.appendChild(opt);
   });
   if (projects[0]) {
     projectSelect.value = projects[0].id;
     currentProject = projects[0].id;
     await loadProject(currentProject);
   }
 }
 
 newProjectBtn.onclick = async () => {
   const name = prompt('Project name?','Demo Project');
   if (!name) return;
   await api('/projects', { method:'POST', body: JSON.stringify({ name, description:'' })});
   await loadProjects();
 };
 
 projectSelect.onchange = async (e) => {
   currentProject = e.target.value;
   await loadProject(currentProject);
 };
 
 refreshBtn.onclick = async () => {
   if (currentProject) await loadProject(currentProject);
 };
 
 async function loadProject(pid) {
   const data = await api(`/projects/${pid}`);
   tasksCache = data.tasks;
   renderTasks(tasksCache);
   populateDepends(tasksCache);
   loadProgress(pid);
   renderDepsGraph(tasksCache);
 }
 
 function renderTasks(tasks) {
   const buckets = { 'todo':document.getElementById('todo'), 'in-progress':document.getElementById('in-progress'), 'done':document.getElementById('done') };
   for (const k of Object.keys(buckets)) buckets[k].innerHTML = '';
   tasks.forEach(t => {
     const el = document.createElement('div');
     el.className = 'task';
     el.draggable = true;
     el.dataset.id = t.id;
     el.innerHTML = `<strong>${t.title}</strong><div class="meta">#${t.id} est:${t.estimated_hours||0} status:${t.status}</div>`;
     el.ondragstart = ev => { ev.dataTransfer.setData('text/plain', t.id); };
 
     // Popup instead of alert
     el.onclick = async () => {
       const detail = await api(`/tasks/${t.id}`);
       const deps = detail.dependencies || [];
 
       // Build popup
       const popup = document.createElement('div');
       popup.className = 'popup';
 
       popup.innerHTML = `
         <h3>Task #${detail.task.id}: ${detail.task.title}</h3>
         <p>Status: ${detail.task.status}</p>
         <h4>Dependencies:</h4>
         <ul id="depList">
           ${deps.map(d => `<li data-depid="${d.id}">#${d.depends_on_task_id} ${d.title} <button class="remove-dep">remove-dependency</button></li>`).join('')}
         </ul>
         <select id="addDepSelect"><option value="">-- add dependency --</option></select>
         <button id="addDepBtn">Add Dependency</button>
         <br><br>
         <button id="closePopup">Close</button>
       `;
 
       document.body.appendChild(popup);
 
       // Populate dropdown with tasks that are not itself or already dependencies
       const addDepSelect = popup.querySelector('#addDepSelect');
       tasksCache.forEach(task => {
         if (task.id !== detail.task.id && !deps.some(d => d.depends_on_task_id === task.id)) {
           const opt = document.createElement('option');
           opt.value = task.id;
           opt.textContent = `#${task.id} ${task.title}`;
           addDepSelect.appendChild(opt);
         }
       });
 
       // Add dependency
       popup.querySelector('#addDepBtn').onclick = async () => {
         const depId = addDepSelect.value;
         if (!depId) return;
         const r = await api(`/tasks/${detail.task.id}/dependencies`, {
           method: 'POST',
           body: JSON.stringify({ depends_on_task_id: parseInt(depId, 10) })
         });
         if (r.error) alert('Error: ' + r.error);
         popup.remove();
         await loadProject(currentProject);
       };
 
       // Remove dependency
       popup.querySelectorAll('.remove-dep').forEach(btn => {
         btn.onclick = async (e) => {
           const li = e.target.closest('li');
           const depId = li.dataset.depid;
           await api(`/tasks/${detail.task.id}/dependencies/${depId}`, { method: 'DELETE' });
           popup.remove();
           await loadProject(currentProject);
         };
       });
 
       // Close
       popup.querySelector('#closePopup').onclick = () => popup.remove();
     };
 
     const status = normalizeStatus(t.status || 'todo');
     const key = status.includes('progress') ? 'in-progress' : (status.includes('done') ? 'done' : 'todo');
     buckets[key].appendChild(el);
   });
 
   // allow drop
   document.querySelectorAll('.list').forEach(list => {
     list.ondragover = e => e.preventDefault();
     list.ondrop = async e => {
       e.preventDefault();
       const id = e.dataTransfer.getData('text/plain');
       const newStatus = list.parentElement.dataset.status;
 
       const detail = await api(`/tasks/${id}`);
       if (detail.error) {
         alert('Error fetching task: ' + detail.error);
         return;
       }
       const curStatus = normalizeStatus(detail.task.status);
 
       if (newStatus === 'done' && curStatus !== 'in-progress') {
         alert('You must move the task to "In Progress" before marking it "Done".');
         return;
       }
 
       if (newStatus === 'in-progress') {
         const blockedDeps = (detail.dependencies || []).filter(d => !isDone(d.status));
         if (blockedDeps.length > 0) {
           alert('Cannot move to In Progress â€” blocked by: ' + blockedDeps.map(d => `${d.title}`).join(', '));
           return;
         }
       }
 
       const resp = await api(`/tasks/${id}/status`, { method:'PUT', body: JSON.stringify({ status: newStatus })});
       if (resp && resp.error) {
         alert('Error: ' + resp.error + (resp.blocked_by ? '\nBlocked by: ' + resp.blocked_by.map(x=>x.title||x.id).join(', ') : ''));
       }
       await loadProject(currentProject);
     };
   });
 }
 
 function populateDepends(tasks) {
   dependsSelect.innerHTML = '<option value="">-- depends on --</option>';
   tasks.forEach(t => {
     const opt = document.createElement('option');
     opt.value = t.id;
     opt.textContent = `#${t.id} ${t.title}`;
     dependsSelect.appendChild(opt);
   });
 }
 
 taskForm.onsubmit = async (e) => {
   e.preventDefault();
   const fd = new FormData(taskForm);
   const title = fd.get('title');
   const estimated_hours = parseInt(fd.get('estimated_hours') || 0, 10);
   const depends_on = fd.get('depends_on');
   const t = await api(`/projects/${currentProject}/tasks`, { method:'POST', body: JSON.stringify({ title, estimated_hours })});
   if (depends_on) {
     const r = await api(`/tasks/${t.id}/dependencies`, { method:'POST', body: JSON.stringify({ depends_on_task_id: parseInt(depends_on,10) })});
     if (r.error) alert('Dependency add error: ' + r.error);
   }
   taskForm.reset();
   await loadProject(currentProject);
 };
 
 async function loadProgress(pid) {
   const p = await api(`/projects/${pid}/progress`);
   document.getElementById('progress').innerText = `Progress: ${p.percent}% (${p.done}/${p.total})`;
   const blockedDiv = document.getElementById('blocked');
   blockedDiv.innerHTML = `<strong>Blocked tasks:</strong><ul>${p.blocked.map(b => `<li>#${b.task.id} ${b.task.title} blocked by: ${b.blockedBy.map(x=>x.title).join(', ')}</li>`).join('')}</ul>`;
 }
 
 function renderDepsGraph(tasks) {
   // Build nodes and links
   const nodes = tasks.map(t => ({ id: t.id, title: t.title }));
   const links = [];
 
   // Fetch dependencies for all tasks
   Promise.all(
     tasks.map(t =>
       fetch(`/api/tasks/${t.id}/dependencies`)
         .then(r => r.json())
         .then(dep => ({ id: t.id, dep }))
     )
   ).then(list => {
     list.forEach(item => {
       item.dep.forEach(d => {
         links.push({ source: item.id, target: d.depends_on_task_id });
       });
     });
 
     // Clear old graph
     const root = document.getElementById('depGraph');
     root.innerHTML = '';
 
     const width = root.clientWidth || 600;
     const height = 400;
     
     const svg = d3.select(root)
       .append('svg')
       .attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
     
     const simulation = d3.forceSimulation(nodes)
       .force('link', d3.forceLink(links).id(d => d.id).distance(120))
       .force('charge', d3.forceManyBody().strength(-300))
       .force('center', d3.forceCenter(width / 2, height / 2));
 
     const link = svg.append('g')
       .attr('stroke', '#999')
       .attr('stroke-opacity', 0.6)
       .selectAll('line')
       .data(links)
       .enter().append('line')
       .attr('stroke-width', 2);
 
     const node = svg.append('g')
       .selectAll('circle')
       .data(nodes)
       .enter().append('circle')
       .attr('r', 30)
       .attr('fill', '#3498db')
       .call(drag(simulation));
 
     const labels = svg.append('g')
       .selectAll('text')
       .data(nodes)
       .enter().append('text')
       .text(d => `#${d.id} ${d.title}`)
       .attr('font-size', '12px')
       .attr('text-anchor', 'middle')
       .attr('dy', 4)
       .attr('fill', 'white');
 
     simulation.on('tick', () => {
       link
         .attr('x1', d => d.source.x)
         .attr('y1', d => d.source.y)
         .attr('x2', d => d.target.x)
         .attr('y2', d => d.target.y);
 
         node
         .attr("cx", d => d.x = Math.max(20, Math.min(width - 20, d.x)))
         .attr("cy", d => d.y = Math.max(20, Math.min(height - 20, d.y)));
       
       labels
         .attr("x", d => d.x)
         .attr("y", d => d.y);
       
     });
 
     function drag(simulation) {
       function dragstarted(event, d) {
         if (!event.active) simulation.alphaTarget(0.3).restart();
         d.fx = d.x;
         d.fy = d.y;
       }
 
       function dragged(event, d) {
         d.fx = event.x;
         d.fy = event.y;
       }
 
       function dragended(event, d) {
         if (!event.active) simulation.alphaTarget(0);
         d.fx = null;
         d.fy = null;
       }
 
       return d3.drag()
         .on('start', dragstarted)
         .on('drag', dragged)
         .on('end', dragended);
     }
   });
 }
 
 
 loadProjects();