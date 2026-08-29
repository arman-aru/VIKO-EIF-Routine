export const getPayload = (
  datefrom,
  dateto,
  all = false,
  groupId = "-992",
  year
) => {
  if (all) {
    return {
      __args: [
        null,
        year,
        {
          vt_filter: { datefrom, dateto },
        },
        {
          op: "fetch",
          needed_part: {
            teachers:   ["id", "short", "name", "firstname", "lastname"],
            classes:    ["id", "short", "name"],
            classrooms: ["id", "short", "name"],
            subjects:   ["id", "short", "name"],
          },
          needed_combos: {},
        },
      ],
      __gsh: "00000000",
    };
  }

  return {
    __args: [
      null,
      {
        year,
        datefrom,
        dateto,
        table: "classes",
        id: groupId,
        showColors: true,
        showIgroupsInClasses: false,
        showOrig: true,
        log_module: "CurrentTTView",
      },
    ],
    __gsh: "00000000",
  };
};
