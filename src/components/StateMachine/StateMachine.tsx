import React, { FC, ReactNode, createContext, useContext } from "react";
import { Result, useTriggeredResultEffect } from "../../index.js";


const ParentStateMachineContext = createContext<Array<Result<any>>>([])
type DependencyValues<Deps extends Array<Result<any>>> = { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never }

export const StateMachine = <T, Deps extends Array<Result<any>>>({
    key,
    callback,
    parentDependencies,
    lifecycleHandlers,
    UiComponent,
    NextNode
}: {
    key: string,
    callback: (dependencyValues: DependencyValues<Deps>) => Promise<T>,
    parentDependencies: Deps,
    lifecycleHandlers?: {
        pending?: (dependencyValues: DependencyValues<Deps>) => void,
        success?: (value: T, dependencyValues: DependencyValues<Deps>) => void
        cleanup?: (value: T) => Promise<void>|void
        failure?: {
            maxRetryCount?: number
            retry?: (error: Error, failureLog: {
                runRetry: (newCallback?: typeof callback) => void,
                retryAttempt: number,
                maxRetryCount: number,
                errorLog: Array<Error>
            }) => void
            final?: (failureLog: {
                maxRetryCount: number,
                errorLog: Array<Error>
            }) => void
        }
    }, 
    UiComponent?: FC<{
        nodeDependencies: Result<T>,
        parentDependencies: DependencyValues<Deps>
    }>
    NextNode?: FC<{
        currentNodeValue: T,
    }>
}) => {
    const [nodeDependency, nodeTrigger] = useTriggeredResultEffect(callback, parentDependencies, lifecycleHandlers)
    return (
        <>
            {UiComponent && <UiComponent
                nodeDependencies={nodeDependency}
                parentDependencies={parentDependencies.map(dep => (dep as Result<any>  & { type: 'success' }).value) as { [K in keyof Deps]: Deps[K] extends Result<infer U> ? U : never }}
            />}
            {NextNode && nodeDependency.type === "success" &&  <NextNode
                currentNodeValue={nodeDependency.value}
            />}
        </>
    )
}

export const Composition = <InletsType extends Array<typeof StateMachine>, OutletType extends FC>({
    Inlets,
    Outlet
}: {
    Inlets: InletsType
    Outlet: OutletType
}) => {
    return (
        <>
            {Inlets.map((Inlet, index) => {
                return (
                    <Inlet 
                        NextNode={({currentNodeValue}) => {
                            return (
                                <></>
                            )
                        }}
                    />
                )
            })}
        </>
    )
}


export const LatestAmiVersion = ({amiLayer, ubuntuVersion, NextNode}: {
    amiLayer: string,
    ubuntuVersion: string,
    NextNode: FC<{
        amiVersion: number,
    }>
}) => <StateMachine
    key="latestAmiVersion"
    callback={async () => {
        // const imagesData = await ec2Client.send(new DescribeImagesCommand({
        //     Filters: [
        //         {
        //             Name: "name",
        //             Values: [`${composeAmiName({
        //                 amiLayer,
        //                 ubuntuVersion
        //             })}*`]
        //         }
        //     ]
        // }));
        // const sortedImages = imagesData.Images!.sort((a, b) => (a.CreationDate! > b.CreationDate! ? -1 : 1));
        // console.log(sortedImages[0]!.Name!)
        // return sortedImages[0]!.Name!.split('.').slice(1).map(str=>{
        //     return parseInt(str)
        // })
        return 5
    }}
    parentDependencies={[]}
    UiComponent={({nodeDependencies}) => {
        return <div></div>
    }}
    NextNode={({currentNodeValue}) => <NextNode
        amiVersion={currentNodeValue}
    />}
/>

