chrome.runtime.sendMessage({ type: "getJob" }, (job) => {
  document.getElementById("st").textContent = job ? `Εργασία: ${job.kaeks.length} ΚΑΕΚ (κύριο ${job.main}) — ${Object.keys(job.done || {}).length} ολοκληρωμένα` : "Καμία ενεργή εργασία.";
});
document.getElementById("clr").onclick = () => chrome.runtime.sendMessage({ type: "clearJob" }, () => { document.getElementById("st").textContent = "Η εργασία ακυρώθηκε."; });
