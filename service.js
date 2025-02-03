const mapTimersList = (list) => {
  return   list.map((timer) => {
    if (timer.is_active) {
      timer.progress = Date.now() - timer.start;
    } else {
      timer.duration = timer.end - timer.start;
    }
    return timer;
  });
}

module.exports = {
  mapTimersList,
};
