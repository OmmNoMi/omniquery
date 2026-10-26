import { ref, computed } from "vue";
import { db } from "../services/db";

const draftsList = ref([]);
const isDraftsLoading = ref(false);

export function useDrafts() {
  const draftsCount = computed(() => draftsList.value.length);

  async function loadDrafts() {
    isDraftsLoading.value = true;
    try {
      const records = await db.responses.where("status").equals("Draft").toArray();
      records.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0)
      );
      draftsList.value = records;
      return records;
    } catch (e) {
      draftsList.value = [];
      return [];
    } finally {
      isDraftsLoading.value = false;
    }
  }

  function setDrafts(records) {
    draftsList.value = Array.isArray(records) ? records : [];
  }

  return {
    draftsList,
    draftsCount,
    loadDrafts,
    setDrafts,
    isDraftsLoading,
  };
}
