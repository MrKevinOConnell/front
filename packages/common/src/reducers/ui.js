const initialState = {
  hasFetchedInitialData: false,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case "initial-data-request-successful":
      return {
        ...state,
        hasFetchedInitialData: true,
      };

    case "logout":
      return initialState;

    default:
      return state;
  }
};

export const selectHasFetchedInitialData = (state) =>
  state.ui.hasFetchedInitialData;

export default reducer;
