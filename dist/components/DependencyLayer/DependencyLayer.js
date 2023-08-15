import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext } from "react";
import { useImmer } from "use-immer";
// Dependency Context
const ParentDependencyUpdaterContext = createContext(null);
export const useUpdateParentDependencyFromChildMap = () => useContext(ParentDependencyUpdaterContext);
const DependencyResolverContext = createContext(null);
export const useDependencyResolverContext = () => useContext(DependencyResolverContext);
// Dependency Control Layer
export const DependencyLayer = ({ dependencyTable, dependencyPropsTable, children }) => {
    const [dependencyResolutionMap, updateDependencyResolutionMap] = useImmer(new Map(Object.entries(dependencyTable).map(([key]) => [
        key, false
    ])));
    return _jsxs(_Fragment, { children: [Object.entries(dependencyTable).map(([key, Component]) => {
                const forwardProps = dependencyPropsTable?.[key];
                return _jsx(DependencyResolverContext.Provider, { value: [
                        dependencyResolutionMap.get(key),
                        (resolved) => updateDependencyResolutionMap(draft => {
                            draft.set(key, resolved);
                        })
                    ], children: _jsx(Component, { ...forwardProps ?? {} }) }, key);
            }), _jsx(ParentDependencyUpdaterContext.Provider, { value: updateDependencyResolutionMap, children: [...dependencyResolutionMap].every(([_, resolved]) => resolved)
                    && children })] });
};
