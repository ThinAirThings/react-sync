import { FC, Fragment, ReactNode, createContext, useContext } from "react"
import { useImmer } from "use-immer"
import React from 'react'
// Dependency Context
type UseImmerReturnType = ReturnType<typeof useImmer<Map<string, boolean>>>
const ParentDependencyUpdaterContext = createContext<UseImmerReturnType[1]>(null as any)
export const useUpdateParentDependencyFromChildMap = () => useContext(ParentDependencyUpdaterContext)
const DependencyResolverContext = createContext<[boolean, (resolved: boolean) => void]>(null as any)
export const useDependencyResolverContext = () => useContext(DependencyResolverContext)

// Dependency Control Layer
export const DependencyLayer = <
    DependencyTable extends Record<string, FC<any>>,
>({
    dependencyTable,
    dependencyPropsTable,
    children,
}: {
    dependencyTable: DependencyTable,
    dependencyPropsTable: {
        [Key in keyof DependencyTable]: DependencyTable[Key] extends FC<infer P>
            ? P 
            : never
    }
    children: ReactNode
}) => {
    const [dependencyResolutionMap, updateDependencyResolutionMap] = useImmer<Map<string, boolean>>(new Map(
        Object.entries(dependencyTable).map(([key]) => [
            key, false
        ])
    ))
    return (<Fragment>
        {Object.entries(dependencyTable).map(([key, Component]) => { 
            const forwardProps = dependencyPropsTable?.[key]
            return <DependencyResolverContext.Provider 
                key={key} 
                value={[
                    dependencyResolutionMap.get(key)!,
                    (resolved: boolean) => updateDependencyResolutionMap(draft => {
                        draft.set(key, resolved)
                    })
                ]}
            >
                <Component
                    {...forwardProps??{}}
                />
            </DependencyResolverContext.Provider>
        })}
        <ParentDependencyUpdaterContext.Provider value={updateDependencyResolutionMap}>
            {[...dependencyResolutionMap].every(([_, resolved]) => resolved)
                && children
            }
        </ParentDependencyUpdaterContext.Provider>
    </Fragment>)
}
