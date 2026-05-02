//
//  Item.swift
//  Schub 2.0
//
//  Created by Eldar Ugay on 27.04.2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
